import { describe, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';
import { StoreContext } from '../../src/ui/hooks/useStore.js';
import { createStore, type Store } from '../../src/state/store.js';
import { emptyPersistedData } from '../../src/storage/serialization.js';
import { Study, type SessionResult } from '../../src/ui/screens/Study.js';
import { selectCards } from '../../src/state/selectors.js';
import type { Repository } from '../../src/storage/repository.js';
import type { Flashcard } from '../../src/types/index.js';
import { ENTER, withRender } from './render.js';

const NOW = new Date(2026, 7, 22, 12, 0);

function seededStore(count: number): { store: Store; cards: Flashcard[] } {
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
    store.dispatch({
      type: 'card/add',
      front: `Q${i}`,
      back: `A${i}`,
      tags: [],
      now: NOW
    });
  }
  return { store, cards: [...selectCards(store.getSnapshot())] };
}

function inStore(store: Store, node: ReactElement): ReactElement {
  return <StoreContext.Provider value={store}>{node}</StoreContext.Provider>;
}

describe('Study loop', () => {
  it('hides the answer until it is revealed', async () => {
    const { store, cards } = seededStore(1);
    await withRender(inStore(store, <Study cards={cards} onFinish={vi.fn()} />), ({ frame }) => {
      expect(frame()).toContain('Q0');
      expect(frame()).not.toContain('A0');
      expect(frame()).toContain('press space to reveal');
    });
  });

  it.each([
    ['space', ' '],
    ['enter', ENTER]
  ])('reveals the answer with %s', async (_name, key) => {
    const { store, cards } = seededStore(1);
    await withRender(
      inStore(store, <Study cards={cards} onFinish={vi.fn()} />),
      async ({ frame, press }) => {
        await press(key);
        expect(frame()).toContain('A0');
        expect(frame()).toContain('[3] Good');
      }
    );
  });

  it.each([
    ['1', 0],
    ['2', 1],
    ['3', 3],
    ['4', 4],
    ['5', 5]
  ])('grades with the fixed key %s', async (key, quality) => {
    const { store, cards } = seededStore(1);
    const onFinish = vi.fn();
    await withRender(
      inStore(store, <Study cards={cards} onFinish={onFinish} />),
      async ({ press }) => {
        await press(' ');
        await press(key);
      }
    );

    const graded = selectCards(store.getSnapshot())[0];
    // Quality below 3 fails and resets the repetition count.
    expect(graded.repetitions).toBe(quality >= 3 ? 1 : 0);
    expect(onFinish).toHaveBeenCalledOnce();
  });

  it('takes two keystrokes per card', async () => {
    const { store, cards } = seededStore(2);
    const onFinish = vi.fn<(result: SessionResult) => void>();
    await withRender(
      inStore(store, <Study cards={cards} onFinish={onFinish} />),
      async ({ press }) => {
        await press(' ');
        await press('3');
        await press(' ');
        await press('3');
      }
    );

    expect(onFinish).toHaveBeenCalledOnce();
    expect(onFinish.mock.calls[0][0]).toMatchObject({ studied: 2, correctAnswers: 2 });
  });

  it('accepts a reveal and a grade that arrive in the same read', async () => {
    // Fast typing lands both bytes in one chunk; they used to be dropped.
    const { store, cards } = seededStore(1);
    await withRender(
      inStore(store, <Study cards={cards} onFinish={vi.fn()} />),
      async ({ press }) => {
        await press(' 3');
      }
    );
    expect(selectCards(store.getSnapshot())[0].repetitions).toBe(1);
  });

  it('grades Good when confirming without picking a number', async () => {
    const { store, cards } = seededStore(1);
    await withRender(
      inStore(store, <Study cards={cards} onFinish={vi.fn()} />),
      async ({ press }) => {
        await press(' ');
        await press(' ');
      }
    );
    const graded = selectCards(store.getSnapshot())[0];
    expect(graded.repetitions).toBe(1);
  });

  it('skips without grading', async () => {
    const { store, cards } = seededStore(1);
    const onFinish = vi.fn<(result: SessionResult) => void>();
    await withRender(
      inStore(store, <Study cards={cards} onFinish={onFinish} />),
      async ({ press }) => {
        await press('s');
      }
    );

    expect(selectCards(store.getSnapshot())[0].repetitions).toBe(0);
    expect(onFinish.mock.calls[0][0]).toMatchObject({ studied: 0, skipped: 1 });
  });

  it('undoes a grade and shows that card again', async () => {
    const { store, cards } = seededStore(2);
    await withRender(
      inStore(store, <Study cards={cards} onFinish={vi.fn()} />),
      async ({ frame, press }) => {
        await press(' ');
        await press('3');
        expect(frame()).toContain('Q1');

        await press('u');
        expect(frame()).toContain('Q0');
        // The answer is hidden again, so the card is genuinely re-studied.
        expect(frame()).not.toContain('A0');
      }
    );

    expect(selectCards(store.getSnapshot())[0].repetitions).toBe(0);
  });

  it('ends early on q and reports it', async () => {
    const { store, cards } = seededStore(3);
    const onFinish = vi.fn<(result: SessionResult) => void>();
    await withRender(
      inStore(store, <Study cards={cards} onFinish={onFinish} />),
      async ({ press }) => {
        await press(' ');
        await press('3');
        await press('q');
      }
    );

    expect(onFinish.mock.calls.at(-1)![0]).toMatchObject({ studied: 1, quitEarly: true });
  });

  it('reports running accuracy in the header', async () => {
    const { store, cards } = seededStore(3);
    await withRender(
      inStore(store, <Study cards={cards} onFinish={vi.fn()} />),
      async ({ frame, press }) => {
        await press(' ');
        await press('1');
        expect(frame()).toContain('0% correct');

        await press(' ');
        await press('3');
        expect(frame()).toContain('50% correct');
      }
    );
  });
});
