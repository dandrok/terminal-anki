import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createStore } from '../../src/state/store.js';
import { FLUSH_AFTER_ACTIONS, FLUSH_IDLE_MS, writePolicyFor } from '../../src/state/persistence.js';
import { emptyPersistedData } from '../../src/storage/serialization.js';
import { selectCards } from '../../src/state/selectors.js';
import type { Repository } from '../../src/storage/repository.js';
import type { AppAction } from '../../src/state/actions.js';

/** In-memory repository that counts writes. */
function fakeRepository() {
  const saves: number[] = [];
  let stored = emptyPersistedData();

  const repository: Repository = {
    dataFile: '/virtual/flashcards.json',
    load: () => ({ data: stored, isNew: false }),
    save: data => {
      stored = data;
      saves.push(data.cards.length);
    },
    isReadOnly: () => false
  };

  return { repository, saves, current: () => stored };
}

const NOW = new Date(2026, 7, 22, 12, 0);

describe('writePolicyFor', () => {
  it.each<[AppAction['type'], string]>([
    ['card/add', 'immediate'],
    ['card/edit', 'immediate'],
    ['card/delete', 'immediate'],
    ['session/record', 'immediate'],
    ['seed', 'immediate']
  ])('writes %s through immediately', (type, expected) => {
    expect(writePolicyFor({ type } as AppAction)).toBe(expected);
  });

  it.each<AppAction['type']>(['card/grade', 'undo', 'session/clearUndo'])('defers %s', type => {
    expect(writePolicyFor({ type } as AppAction)).toBe('deferred');
  });
});

describe('write batching', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not write on every grade', () => {
    // Regression: v1 rewrote the entire JSON file on every single grade.
    const { repository, saves } = fakeRepository();
    const store = createStore({ repository, seedSampleCards: false });

    store.dispatch({ type: 'card/add', front: 'Q', back: 'A', tags: [], now: NOW });
    const id = selectCards(store.getSnapshot())[0].id;
    const writesAfterAdd = saves.length;

    for (let i = 0; i < 10; i++) {
      store.dispatch({ type: 'card/grade', id, quality: 3, now: NOW });
    }

    expect(saves.length).toBe(writesAfterAdd);
  });

  it('flushes after the idle window', () => {
    const { repository, saves } = fakeRepository();
    const store = createStore({ repository, seedSampleCards: false });
    store.dispatch({ type: 'card/add', front: 'Q', back: 'A', tags: [], now: NOW });
    const id = selectCards(store.getSnapshot())[0].id;
    const before = saves.length;

    store.dispatch({ type: 'card/grade', id, quality: 3, now: NOW });
    expect(saves.length).toBe(before);

    vi.advanceTimersByTime(FLUSH_IDLE_MS);
    expect(saves.length).toBe(before + 1);
  });

  it('forces a flush once the pending action cap is reached', () => {
    const { repository, saves } = fakeRepository();
    const store = createStore({ repository, seedSampleCards: false });
    store.dispatch({ type: 'card/add', front: 'Q', back: 'A', tags: [], now: NOW });
    const id = selectCards(store.getSnapshot())[0].id;
    const before = saves.length;

    for (let i = 0; i < FLUSH_AFTER_ACTIONS; i++) {
      store.dispatch({ type: 'card/grade', id, quality: 3, now: NOW });
    }

    // Bounds worst-case loss by count as well as by time.
    expect(saves.length).toBe(before + 1);
  });

  it('keeps a whole session under a handful of writes', () => {
    const { repository, saves } = fakeRepository();
    const store = createStore({ repository, seedSampleCards: false });
    store.dispatch({ type: 'card/add', front: 'Q', back: 'A', tags: [], now: NOW });
    const id = selectCards(store.getSnapshot())[0].id;

    for (let i = 0; i < 100; i++) {
      store.dispatch({ type: 'card/grade', id, quality: 3, now: NOW });
    }
    store.flush();

    // v1 would have written 100 times here.
    expect(saves.length).toBeLessThanOrEqual(7);
  });

  it('writes user content through immediately', () => {
    const { repository, saves } = fakeRepository();
    const store = createStore({ repository, seedSampleCards: false });

    store.dispatch({ type: 'card/add', front: 'Q', back: 'A', tags: [], now: NOW });
    expect(saves.length).toBe(1);

    const id = selectCards(store.getSnapshot())[0].id;
    store.dispatch({ type: 'card/edit', id, front: 'Q2' });
    expect(saves.length).toBe(2);

    store.dispatch({ type: 'card/delete', id });
    expect(saves.length).toBe(3);
  });

  it('an immediate action also persists pending deferred changes', () => {
    const { repository, saves, current } = fakeRepository();
    const store = createStore({ repository, seedSampleCards: false });
    store.dispatch({ type: 'card/add', front: 'Q', back: 'A', tags: [], now: NOW });
    const id = selectCards(store.getSnapshot())[0].id;

    store.dispatch({ type: 'card/grade', id, quality: 5, now: NOW });
    store.dispatch({ type: 'card/add', front: 'R', back: 'B', tags: [], now: NOW });

    expect(current().cards[0].repetitions).toBe(1);
    expect(saves.length).toBe(2);
  });

  it('flush is a no-op when nothing is pending', () => {
    const { repository, saves } = fakeRepository();
    const store = createStore({ repository, seedSampleCards: false });
    const before = saves.length;
    store.flush();
    store.flush();
    expect(saves.length).toBe(before);
  });

  it('dispose flushes pending work', () => {
    const { repository, saves, current } = fakeRepository();
    const store = createStore({ repository, seedSampleCards: false });
    store.dispatch({ type: 'card/add', front: 'Q', back: 'A', tags: [], now: NOW });
    const id = selectCards(store.getSnapshot())[0].id;
    const before = saves.length;

    store.dispatch({ type: 'card/grade', id, quality: 5, now: NOW });
    store.dispose();

    expect(saves.length).toBe(before + 1);
    expect(current().cards[0].repetitions).toBe(1);
  });
});
