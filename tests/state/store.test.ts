import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createStore, type Store } from '../../src/state/store.js';
import { emptyPersistedData } from '../../src/storage/serialization.js';
import { MAX_SESSION_HISTORY } from '../../src/state/reducer.js';
import {
  selectCards,
  selectExtendedStats,
  selectFilteredCards
} from '../../src/state/selectors.js';
import type { StudySessionRecord } from '../../src/types/index.js';

let workspace: string;
let dataFile: string;
let opened: Store[] = [];

/**
 * Create a store and remember it, so `afterEach` can dispose it.
 *
 * An undisposed store keeps a debounce timer that could fire after the
 * workspace is deleted and recreate the directory underneath another test.
 */
function makeStore(options: Parameters<typeof createStore>[0] = {}): Store {
  const created = createStore({ dataFile, legacyFile: null, ...options });
  opened.push(created);
  return created;
}

function store(seedSampleCards = false): Store {
  return makeStore({ seedSampleCards });
}

const cards = (s: Store) => [...selectCards(s.getSnapshot())];

function addCard(s: Store, front: string, back = front.toUpperCase(), tags: string[] = []) {
  s.dispatch({ type: 'card/add', front, back, tags, now: new Date() });
  return cards(s).at(-1)!;
}

function session(overrides: Partial<Omit<StudySessionRecord, 'id'>> = {}) {
  const startTime = overrides.startTime ?? new Date();
  return {
    type: 'session/record' as const,
    now: new Date(),
    session: {
      startTime,
      endTime: new Date(startTime.getTime() + 60_000),
      cardsStudied: 1,
      correctAnswers: 1,
      incorrectAnswers: 0,
      averageDifficulty: 1,
      sessionType: 'due' as const,
      quitEarly: false,
      ...overrides
    }
  };
}

beforeEach(() => {
  workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'anki-store-'));
  dataFile = path.join(workspace, 'flashcards.json');
  opened = [];
});

afterEach(() => {
  for (const created of opened) {
    created.dispose();
  }
  opened = [];
  fs.rmSync(workspace, { recursive: true, force: true });
});

describe('card ids', () => {
  it('never reuses the id of a live card after a delete', () => {
    // Regression: ids came from cards.length + 1, so deleting a middle card
    // made the next add collide and the delete menu removed the wrong card.
    const s = store();
    const created = ['a', 'b', 'c', 'd', 'e'].map(front => addCard(s, front));

    s.dispatch({ type: 'card/delete', id: created[2].id, now: new Date() });
    const added = addCard(s, 'f');

    const ids = cards(s).map(card => card.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.filter(id => id === added.id)).toHaveLength(1);
  });

  it('deletes exactly the card that was asked for', () => {
    const s = store();
    const keep = addCard(s, 'keep');
    const drop = addCard(s, 'drop');
    s.dispatch({ type: 'card/delete', id: keep.id, now: new Date() });
    addCard(s, 'new');

    s.dispatch({ type: 'card/delete', id: drop.id, now: new Date() });
    expect(cards(s).map(card => card.front)).toEqual(['new']);
  });

  it('ignores an unknown id without changing state', () => {
    const s = store();
    const before = s.getSnapshot();
    s.dispatch({ type: 'card/delete', id: 'does-not-exist', now: new Date() });
    expect(s.getSnapshot()).toBe(before);
  });
});

describe('addCard', () => {
  it('normalizes tags', () => {
    const card = addCard(store(), 'Q', 'A', [' Web ', 'WEB', '', 'api']);
    expect(card.tags).toEqual(['web', 'api']);
  });

  it('unlocks the first-card achievement', () => {
    const s = store();
    addCard(s, 'Q');
    const first = selectExtendedStats(s.getSnapshot()).achievements.find(
      a => a.id === 'first_card'
    );
    expect(first?.unlockedAt).toBeInstanceOf(Date);
  });

  it('persists across a reload', () => {
    const s = store();
    addCard(s, 'Persisted', 'Yes', ['tag']);
    s.flush();

    const reloaded = store();
    expect(cards(reloaded)).toHaveLength(1);
    expect(cards(reloaded)[0]).toMatchObject({ front: 'Persisted', tags: ['tag'] });
  });
});

describe('sample cards', () => {
  it('seeds a first run', () => {
    expect(cards(makeStore())).toHaveLength(5);
  });

  it('does not resurrect samples after the last card is deleted', () => {
    // Regression: an empty collection re-seeded samples on every launch.
    const s = makeStore();
    for (const card of cards(s)) {
      s.dispatch({ type: 'card/delete', id: card.id, now: new Date() });
    }
    s.flush();
    expect(cards(makeStore())).toEqual([]);
  });

  it('gives sample cards distinct ids', () => {
    const ids = cards(makeStore()).map(c => c.id);
    expect(new Set(ids).size).toBe(5);
  });

  it('does not seed over data it could not preserve', () => {
    fs.writeFileSync(dataFile, '{ broken json');
    const copyFileSync = fs.copyFileSync;
    (fs as { copyFileSync: typeof fs.copyFileSync }).copyFileSync = () => {
      throw new Error('denied');
    };
    try {
      const s = makeStore({ onWarning: () => undefined });
      expect(cards(s)).toEqual([]);
      expect(fs.readFileSync(dataFile, 'utf-8')).toBe('{ broken json');
    } finally {
      (fs as { copyFileSync: typeof fs.copyFileSync }).copyFileSync = copyFileSync;
    }
  });
});

describe('grading', () => {
  it('persists the new schedule', () => {
    const s = store();
    const card = addCard(s, 'Q');
    s.dispatch({ type: 'card/grade', id: card.id, quality: 5, now: new Date() });
    s.flush();

    const reloaded = cards(store())[0];
    expect(reloaded.repetitions).toBe(1);
    expect(reloaded.lastReview).toBeInstanceOf(Date);
  });

  it('does not mutate the previous snapshot', () => {
    const s = store();
    const card = addCard(s, 'Q');
    const before = s.getSnapshot();

    s.dispatch({ type: 'card/grade', id: card.id, quality: 5, now: new Date() });

    // Snapshot identity is how Ink detects change; in-place mutation would
    // leave the screen frozen with no error.
    expect(s.getSnapshot()).not.toBe(before);
    expect(before.data.cards[0].repetitions).toBe(0);
  });
});

describe('sessions', () => {
  it('updates the streak', () => {
    const s = store();
    s.dispatch(session());
    expect(selectExtendedStats(s.getSnapshot()).learningStreak.currentStreak).toBe(1);
  });

  it('caps stored history', () => {
    // Through an in-memory repository rather than the workspace file. Recording
    // a session writes through immediately, so filling the cap on real disk
    // rewrites a growing file MAX_SESSION_HISTORY + 10 times over — tens of
    // megabytes of I/O to prove something the reducer decides on its own.
    let saved = emptyPersistedData();
    const s = makeStore({
      repository: {
        dataFile,
        load: () => ({ data: saved, isNew: false }),
        save: data => {
          saved = data;
        },
        isReadOnly: () => false
      }
    });

    for (let i = 0; i < MAX_SESSION_HISTORY + 10; i++) {
      s.dispatch(session());
    }
    s.flush();

    // Asserting recentSessions here would prove nothing: it is slice(-10) and
    // would read 10 even if the cap were removed entirely.
    expect(saved.sessionHistory).toHaveLength(MAX_SESSION_HISTORY);
  });

  it('reloads the sessions it wrote', () => {
    const s = store();
    s.dispatch(session({ cardsStudied: 7 }));
    s.dispatch(session({ cardsStudied: 9 }));
    s.flush();

    const reloaded = store().getSnapshot().data.sessionHistory;
    expect(reloaded.map(entry => entry.cardsStudied)).toEqual([7, 9]);
  });

  it('counts only completed sessions toward the session achievement', () => {
    const s = store();
    s.dispatch(session({ quitEarly: true }));
    const first = selectExtendedStats(s.getSnapshot()).achievements.find(
      a => a.id === 'first_session'
    );
    expect(first?.unlockedAt).toBeUndefined();
  });

  it('gives every session a distinct id', () => {
    const s = store();
    s.dispatch(session());
    s.dispatch(session());
    const ids = s.getSnapshot().data.sessionHistory.map(entry => entry.id);
    expect(new Set(ids).size).toBe(2);
  });
});

describe('session averages', () => {
  it('averages only over completed sessions', () => {
    // Dividing all-session minutes by the completed count inflated this.
    const s = store();
    const start = new Date(2026, 7, 22, 10, 0);
    const tenMinutes = { startTime: start, endTime: new Date(start.getTime() + 10 * 60_000) };

    s.dispatch(session({ ...tenMinutes, quitEarly: false }));
    s.dispatch(session({ ...tenMinutes, quitEarly: true }));

    const stats = selectExtendedStats(s.getSnapshot());
    expect(stats.totalStudyTime).toBe(20); // all sessions
    expect(stats.sessionsCompleted).toBe(1);
    expect(stats.averageSessionLength).toBe(10); // completed only, was 20
  });
});

describe('stats', () => {
  it('reports zero easiness rather than NaN for an empty collection', () => {
    expect(selectExtendedStats(store().getSnapshot()).averageEasiness).toBe(0);
  });

  it('reports a lapsed streak as zero', () => {
    const s = store();
    s.dispatch(session({ startTime: new Date(2020, 0, 1) }));
    expect(selectExtendedStats(s.getSnapshot()).learningStreak.currentStreak).toBe(0);
  });
});

describe('filtering', () => {
  it('applies dueOnly together with tags', () => {
    const s = store();
    const due = addCard(s, 'due', 'x', ['t']);
    const later = addCard(s, 'later', 'y', ['t']);
    s.dispatch({ type: 'card/grade', id: later.id, quality: 5, now: new Date() });
    addCard(s, 'other', 'z', ['u']);

    const result = selectFilteredCards(s.getSnapshot(), { dueOnly: true, tags: ['t'] });
    expect(result.map(card => card.id)).toEqual([due.id]);
  });
});

describe('editing', () => {
  it('replaces and normalizes tags', () => {
    const s = store();
    const card = addCard(s, 'Q', 'A', ['old']);
    s.dispatch({ type: 'card/edit', id: card.id, tags: [' New ', 'NEW'], now: new Date() });
    expect(cards(s)[0].tags).toEqual(['new']);
  });

  it('edits front and back', () => {
    const s = store();
    const card = addCard(s, 'Q', 'A');
    s.dispatch({ type: 'card/edit', id: card.id, front: 'Q2', back: 'A2', now: new Date() });
    expect(cards(s)[0]).toMatchObject({ front: 'Q2', back: 'A2' });
  });

  it('ignores an unknown card', () => {
    const s = store();
    const before = s.getSnapshot();
    s.dispatch({ type: 'card/edit', id: 'nope', tags: ['x'], now: new Date() });
    expect(s.getSnapshot()).toBe(before);
  });
});

describe('subscribe', () => {
  it('notifies listeners on change and stops after unsubscribe', () => {
    const s = store();
    const listener = vi.fn();
    const unsubscribe = s.subscribe(listener);

    addCard(s, 'Q');
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    addCard(s, 'R');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('does not notify when an action changes nothing', () => {
    const s = store();
    const listener = vi.fn();
    s.subscribe(listener);
    s.dispatch({ type: 'card/delete', id: 'missing', now: new Date() });
    expect(listener).not.toHaveBeenCalled();
  });
});
