import { describe, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';
import { StoreContext } from '../../src/ui/hooks/useStore.js';
import { createStore, type Store } from '../../src/state/store.js';
import { emptyPersistedData } from '../../src/storage/serialization.js';
import { Browse } from '../../src/ui/screens/Browse.js';
import { selectCards } from '../../src/state/selectors.js';
import type { Repository } from '../../src/storage/repository.js';
import { withRender } from './render.js';

const NOW = new Date(2026, 7, 22, 12, 0);

function storeWith(count: number): Store {
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
  for (let i = 0; i < count; i++) {
    store.dispatch({ type: 'card/add', front: `Card ${i}`, back: `A${i}`, tags: [], now: NOW });
  }
  return store;
}

function inStore(store: Store, node: ReactElement): ReactElement {
  return <StoreContext.Provider value={store}>{node}</StoreContext.Provider>;
}

describe('Browse delete confirmation', () => {
  it('offers only the keys that work while confirming', async () => {
    await withRender(
      inStore(storeWith(3), <Browse onBack={vi.fn()} onEdit={vi.fn()} />),
      async ({ frame, press }) => {
        expect(frame()).toContain('delete');
        await press('d');
        const output = frame();
        expect(output).toContain('Delete this card?');
        // The browse keys do nothing here, so the footer must not advertise them.
        expect(output).not.toContain('filter');
        expect(output).not.toContain('undo');
        expect(output).toContain('[y]');
        expect(output).toContain('[n]');
        // The standard tail is still where it always is.
        expect(output.indexOf('back')).toBeLessThan(output.indexOf('help'));
      }
    );
  });

  it('deletes on y and can be undone', async () => {
    const store = storeWith(3);
    await withRender(
      inStore(store, <Browse onBack={vi.fn()} onEdit={vi.fn()} />),
      async ({ frame, press }) => {
        await press('d');
        await press('y');
        expect(selectCards(store.getSnapshot())).toHaveLength(2);
        expect(frame()).toContain('2 cards');

        await press('u');
        expect(selectCards(store.getSnapshot())).toHaveLength(3);
      }
    );
  });

  it('keeps the card on n', async () => {
    const store = storeWith(3);
    await withRender(
      inStore(store, <Browse onBack={vi.fn()} onEdit={vi.fn()} />),
      async ({ frame, press }) => {
        await press('d');
        await press('n');
        expect(selectCards(store.getSnapshot())).toHaveLength(3);
        expect(frame()).not.toContain('Delete this card?');
      }
    );
  });
});
