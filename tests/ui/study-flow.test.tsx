import { describe, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';
import { StoreContext } from '../../src/ui/hooks/useStore.js';
import { createStore, type Store } from '../../src/state/store.js';
import { emptyPersistedData } from '../../src/storage/serialization.js';
import { StudyFlow } from '../../src/ui/screens/StudyFlow.js';
import { selectCards, selectDueCards } from '../../src/state/selectors.js';
import type { Repository } from '../../src/storage/repository.js';
import { withRender } from './render.js';

const NOW = new Date(2026, 7, 22, 12, 0);
const RETURN = String.fromCharCode(13);

function inStore(store: Store, node: ReactElement): ReactElement {
  return <StoreContext.Provider value={store}>{node}</StoreContext.Provider>;
}

/** Three cards, all scheduled into the future, so nothing is due today. */
function nothingDueStore(): Store {
  let stored = emptyPersistedData();
  const repository: Repository = {
    dataFile: '/virtual/f.json',
    load: () => ({ data: stored, isNew: false }),
    save: data => {
      stored = data;
    },
    isReadOnly: () => false
  };
  const store = createStore({ repository, seedSampleCards: false });

  for (let i = 0; i < 3; i++) {
    store.dispatch({ type: 'card/add', front: `Q${i}`, back: `A${i}`, tags: [], now: NOW });
  }
  for (const card of selectCards(store.getSnapshot())) {
    store.dispatch({ type: 'card/grade', id: card.id, quality: 5, now: NOW });
  }
  return store;
}

describe('StudyFlow with nothing due', () => {
  it('has a deck where no card is due', () => {
    expect(selectDueCards(nothingDueStore().getSnapshot())).toHaveLength(0);
  });

  it('says so for a due session', async () => {
    await withRender(
      inStore(nothingDueStore(), <StudyFlow onExit={vi.fn()} onQuit={vi.fn()} />),
      ({ frame }) => {
        expect(frame()).toContain('No cards due for review');
      }
    );
  });

  it('still starts a custom session over all cards', async () => {
    // The "nothing due" guard used to run before the phase switch, so choosing
    // "all cards" in a custom session started it and then immediately replaced
    // the first card with "No cards due for review" — the one route that is
    // supposed to work when nothing is due was the one that could not.
    await withRender(
      inStore(nothingDueStore(), <StudyFlow onExit={vi.fn()} onQuit={vi.fn()} mode="custom" />),
      async ({ frame, press }) => {
        expect(frame()).toContain('Custom study');
        // Scope is the first row; toggle it from "due cards only" to "all cards".
        await press('l');
        expect(frame()).toContain('all cards');
        expect(frame()).toContain('3 cards match');

        await press(RETURN);
        expect(frame()).not.toContain('No cards due for review');
        // Which card comes first is up to the shuffle; that a card is showing
        // at all is the point.
        expect(frame()).toMatch(/Q[012]/);
      }
    );
  });
});
