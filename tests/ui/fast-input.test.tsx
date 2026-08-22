import { describe, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';
import { StoreContext } from '../../src/ui/hooks/useStore.js';
import { createStore, type Store } from '../../src/state/store.js';
import { emptyPersistedData } from '../../src/storage/serialization.js';
import { Analytics } from '../../src/ui/screens/Analytics.js';
import { Browse } from '../../src/ui/screens/Browse.js';
import { CardForm, type CardDraft } from '../../src/ui/screens/CardForm.js';
import { CustomStudySetup } from '../../src/ui/screens/CustomStudySetup.js';
import { StudySetup } from '../../src/ui/screens/StudySetup.js';
import type { Repository } from '../../src/storage/repository.js';
import { withRender } from './render.js';

const NOW = new Date(2026, 7, 22, 12, 0);
const RETURN = String.fromCharCode(13);

/**
 * Everything here presses several keys as a *single* string.
 *
 * That is not an artificial case: Ink hands over whatever arrived in one read,
 * so anything typed faster than the event loop turns over — or pasted — lands
 * as one chunk. Screens that folded each keystroke into state read from the
 * render closure processed the whole chunk against the same stale value, so
 * "abc" typed quickly stored "c" and "jjj" moved one row.
 */

function storeWith(cards: number): Store {
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
  for (let i = 0; i < cards; i++) {
    store.dispatch({ type: 'card/add', front: `Card ${i}`, back: `A${i}`, tags: [], now: NOW });
  }
  return store;
}

function inStore(store: Store, node: ReactElement): ReactElement {
  return <StoreContext.Provider value={store}>{node}</StoreContext.Provider>;
}

describe('CardForm under one chunk', () => {
  it('keeps every character of a fast-typed run', async () => {
    await withRender(<CardForm onSave={vi.fn()} onCancel={vi.fn()} />, async ({ frame, press }) => {
      await press('algorithm');
      expect(frame()).toContain('algorithm');
    });
  });

  it('accepts a whole pasted form, fields and returns together', async () => {
    const onSave = vi.fn<(draft: CardDraft) => void>();
    await withRender(<CardForm onSave={onSave} onCancel={vi.fn()} />, async ({ press }) => {
      await press(`Front text${RETURN}Back text${RETURN}one,two${RETURN}`);
    });

    expect(onSave).toHaveBeenCalledOnce();
    expect(onSave.mock.calls[0][0]).toEqual({
      front: 'Front text',
      back: 'Back text',
      tags: ['one', 'two']
    });
  });

  it('saves what was just typed rather than the last rendered value', async () => {
    const onSave = vi.fn<(draft: CardDraft) => void>();
    await withRender(<CardForm onSave={onSave} onCancel={vi.fn()} />, async ({ press }) => {
      await press('Q');
      await press('\r');
      await press(`A${RETURN}`);
      await press(RETURN);
    });
    expect(onSave.mock.calls[0][0].back).toBe('A');
  });
});

describe('Browse under one chunk', () => {
  it('moves one row per keystroke', async () => {
    await withRender(
      inStore(storeWith(5), <Browse onBack={vi.fn()} onEdit={vi.fn()} />),
      async ({ frame, press }) => {
        await press('jjj');
        expect(frame()).toContain('❯ ● Card 3');
      }
    );
  });

  it('keeps every character of a fast-typed filter', async () => {
    await withRender(
      inStore(storeWith(5), <Browse onBack={vi.fn()} onEdit={vi.fn()} />),
      async ({ frame, press }) => {
        await press('/');
        await press('Card 2');
        expect(frame()).toContain('Card 2');
        expect(frame()).toContain('1 of 5 match');
      }
    );
  });
});

describe('CustomStudySetup under one chunk', () => {
  it('moves one row per keystroke', async () => {
    await withRender(
      <CustomStudySetup
        allTags={['alpha']}
        matchCount={() => 3}
        onStart={vi.fn()}
        onCancel={vi.fn()}
      />,
      async ({ frame, press }) => {
        await press('jj');
        expect(frame()).toContain('❯ Difficulty:');
      }
    );
  });

  it('cycles the row the cursor just landed on, not the one it left', async () => {
    await withRender(
      <CustomStudySetup
        allTags={['alpha']}
        matchCount={() => 3}
        onStart={vi.fn()}
        onCancel={vi.fn()}
      />,
      async ({ frame, press }) => {
        // Two rows down to Difficulty, then two steps along its values.
        await press('jjll');
        expect(frame()).toContain('❯ Difficulty:');
        expect(frame()).toContain('learning');
        // Scope was left alone on the way past.
        expect(frame()).toContain('due cards only');
      }
    );
  });
});

describe('StudySetup under one chunk', () => {
  it('steps the counter once per keystroke', async () => {
    await withRender(
      <StudySetup dueCount={50} onStart={vi.fn()} onCancel={vi.fn()} onQuit={vi.fn()} />,
      async ({ frame, press }) => {
        // Down to "Custom number…" and open it.
        await press('jjj');
        await press(RETURN);
        await press('lll');
        expect(frame()).toContain('13');
      }
    );
  });
});

describe('Analytics under one chunk', () => {
  it('advances one pane per keystroke', async () => {
    await withRender(
      inStore(storeWith(1), <Analytics onBack={vi.fn()} onQuit={vi.fn()} />),
      async ({ frame, press }) => {
        await press('ll');
        expect(frame()).toContain('No tags yet');
      }
    );
  });
});
