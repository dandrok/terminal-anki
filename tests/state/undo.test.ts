import { describe, expect, it } from 'vitest';
import { createInitialState, reduce, MAX_UNDO_DEPTH } from '../../src/state/reducer.js';
import { emptyPersistedData } from '../../src/storage/serialization.js';
import { selectCanUndo } from '../../src/state/selectors.js';
import type { AppState } from '../../src/state/reducer.js';
import type { AppAction } from '../../src/state/actions.js';
import type { Flashcard } from '../../src/types/index.js';

const NOW = new Date(2026, 7, 22, 12, 0);

const blank = (): AppState => createInitialState(emptyPersistedData());

const run = (state: AppState, ...actions: AppAction[]): AppState =>
  actions.reduce((current, action) => reduce(current, action), state);

const add = (front: string): AppAction => ({
  type: 'card/add',
  front,
  back: front.toUpperCase(),
  tags: [],
  now: NOW
});

function withCards(...fronts: string[]): AppState {
  return run(blank(), ...fronts.map(add));
}

const fronts = (state: AppState) => state.data.cards.map(card => card.front);

describe('undo of a delete', () => {
  it('restores the card at its original index, not at the end', () => {
    // Pushing to the end would silently reorder the browse list under the user.
    const state = withCards('a', 'b', 'c');
    const middleId = state.data.cards[1].id;

    const deleted = reduce(state, { type: 'card/delete', id: middleId, now: NOW });
    expect(fronts(deleted)).toEqual(['a', 'c']);

    const restored = reduce(deleted, { type: 'undo', now: NOW });
    expect(fronts(restored)).toEqual(['a', 'b', 'c']);
  });

  it('restores the card identity and contents exactly', () => {
    const state = withCards('a');
    const original = state.data.cards[0];

    const restored = run(
      state,
      { type: 'card/delete', id: original.id, now: NOW },
      { type: 'undo', now: NOW }
    );
    expect(restored.data.cards[0]).toEqual(original);
  });
});

describe('undo of a grade', () => {
  it('restores the exact prior scheduling state', () => {
    // SM-2 is lossy: easiness is clamped at 1.3 and intervals are ceil'd, so
    // the prior value cannot be recomputed from the new one. Undo therefore
    // snapshots the card rather than inverting the operation.
    const state = withCards('a');
    const card = state.data.cards[0];

    const graded = reduce(state, { type: 'card/grade', id: card.id, quality: 5, now: NOW });
    expect(graded.data.cards[0].repetitions).toBe(1);

    const undone = reduce(graded, { type: 'undo', now: NOW });
    expect(undone.data.cards[0]).toEqual(card);
    expect(undone.data.cards[0].easiness).toBe(card.easiness);
    expect(undone.data.cards[0].lastReview).toBeNull();
  });

  it('survives a grade sequence that saturates the easiness floor', () => {
    let state = withCards('a');
    const id = state.data.cards[0].id;
    for (let i = 0; i < 25; i++) {
      state = reduce(state, { type: 'card/grade', id, quality: 0, now: NOW });
    }
    const atFloor = state.data.cards[0].easiness;
    expect(atFloor).toBe(1.3);

    const before = state.data.cards[0];
    const graded = reduce(state, { type: 'card/grade', id, quality: 0, now: NOW });
    const undone = reduce(graded, { type: 'undo', now: NOW });
    expect(undone.data.cards[0]).toEqual(before);
  });
});

describe('undo of an edit', () => {
  it('restores the previous front, back and tags', () => {
    const state = run(blank(), {
      type: 'card/add',
      front: 'Q',
      back: 'A',
      tags: ['old'],
      now: NOW
    });
    const original = state.data.cards[0];

    const edited = reduce(state, {
      type: 'card/edit',
      id: original.id,
      front: 'Q2',
      back: 'A2',
      tags: ['new'],
      now: NOW
    });
    expect(edited.data.cards[0]).toMatchObject({ front: 'Q2', back: 'A2', tags: ['new'] });

    const undone = reduce(edited, { type: 'undo', now: NOW });
    expect(undone.data.cards[0]).toEqual(original);
  });
});

describe('recording a session', () => {
  it('marks a study day unconditionally, so callers must skip empty sessions', () => {
    // The guard lives in the caller (StudyFlow.finish, and legacy.ts for the
    // screens not yet ported): it skips session/record when studied is zero,
    // because quitting before grading anything must not advance the streak.
    const recorded = reduce(blank(), {
      type: 'session/record',
      now: NOW,
      session: {
        startTime: NOW,
        endTime: NOW,
        cardsStudied: 0,
        correctAnswers: 0,
        incorrectAnswers: 0,
        averageDifficulty: 0,
        sessionType: 'due',
        quitEarly: true
      }
    });
    expect(recorded.data.learningStreak.currentStreak).toBe(1);
    expect(recorded.data.learningStreak.studyDates).toEqual(['2026-08-22']);
  });
});

describe('achievement progress', () => {
  const progress = (state: AppState, id: string) =>
    state.data.achievements.find(a => a.id === id)!.progress.current;

  it('tracks reviews as cards are graded, not only when a session ends', () => {
    // Grading used to leave reviews_100 reading 0 until a session was recorded.
    let state = withCards('a');
    const id = state.data.cards[0].id;
    for (let i = 0; i < 5; i++) {
      state = reduce(state, { type: 'card/grade', id, quality: 3, now: NOW });
    }
    expect(state.data.cards[0].repetitions).toBe(5);
    expect(progress(state, 'reviews_100')).toBe(5);
  });

  it('refreshes after a delete', () => {
    const state = withCards('a', 'b');
    const deleted = reduce(state, { type: 'card/delete', id: state.data.cards[0].id, now: NOW });
    // Peak progress never regresses, but the achievement was evaluated.
    expect(progress(deleted, 'cards_10')).toBeGreaterThanOrEqual(2);
  });
});

describe('undo stack', () => {
  it('is empty to begin with', () => {
    expect(selectCanUndo(blank())).toBe(false);
  });

  it('does nothing when there is nothing to undo', () => {
    const state = blank();
    expect(reduce(state, { type: 'undo', now: NOW })).toBe(state);
  });

  it('unwinds in reverse order', () => {
    let state = withCards('a', 'b', 'c');
    const [first, second] = [state.data.cards[0].id, state.data.cards[1].id];

    state = run(
      state,
      { type: 'card/delete', id: first, now: NOW },
      { type: 'card/delete', id: second, now: NOW }
    );
    expect(fronts(state)).toEqual(['c']);

    state = reduce(state, { type: 'undo', now: NOW });
    expect(fronts(state)).toEqual(['b', 'c']);

    state = reduce(state, { type: 'undo', now: NOW });
    expect(fronts(state)).toEqual(['a', 'b', 'c']);
  });

  it('is bounded so a long session cannot grow it without limit', () => {
    let state = withCards('a');
    const id = state.data.cards[0].id;
    for (let i = 0; i < MAX_UNDO_DEPTH + 15; i++) {
      state = reduce(state, { type: 'card/grade', id, quality: 3, now: NOW });
    }
    expect(state.undo).toHaveLength(MAX_UNDO_DEPTH);
  });

  it('adding a card is not undoable', () => {
    expect(withCards('a').undo).toHaveLength(0);
  });

  it('is cleared once a session is recorded', () => {
    // A graded card must not be un-gradeable after its session is on record.
    let state = withCards('a');
    const id = state.data.cards[0].id;
    state = reduce(state, { type: 'card/grade', id, quality: 3, now: NOW });
    expect(selectCanUndo(state)).toBe(true);

    state = reduce(state, {
      type: 'session/record',
      now: NOW,
      session: {
        startTime: NOW,
        endTime: NOW,
        cardsStudied: 1,
        correctAnswers: 1,
        incorrectAnswers: 0,
        averageDifficulty: 2,
        sessionType: 'due',
        quitEarly: false
      }
    });
    expect(selectCanUndo(state)).toBe(false);
  });

  it('never mutates the state it is given', () => {
    const state = withCards('a', 'b');
    const snapshot = JSON.stringify(state);
    reduce(state, { type: 'card/delete', id: state.data.cards[0].id, now: NOW });
    expect(JSON.stringify(state)).toBe(snapshot);
  });
});

describe('undo of an import', () => {
  const imported = (id: string, front: string): Flashcard => ({
    id,
    front,
    back: front.toUpperCase(),
    tags: [],
    easiness: 2.5,
    interval: 1,
    repetitions: 0,
    nextReview: NOW,
    lastReview: null,
    createdAt: NOW
  });

  const importAction = (added: Flashcard[], updated: Flashcard[] = []): AppAction => ({
    type: 'cards/import',
    added,
    updated,
    now: NOW
  });

  it('removes everything the import added', () => {
    const state = run(withCards('mine'), importAction([imported('i1', 'x'), imported('i2', 'y')]));
    expect(fronts(state)).toEqual(['mine', 'x', 'y']);

    expect(fronts(reduce(state, { type: 'undo', now: NOW }))).toEqual(['mine']);
  });

  it('is one undo entry however many cards it brought in', () => {
    // The stack is 20 deep, so an entry per card would make undoing a
    // 3,000-card deck impossible by construction.
    const many = Array.from({ length: 50 }, (_v, index) => imported(`i${index}`, `card ${index}`));
    const state = run(blank(), importAction(many));

    expect(state.undo).toHaveLength(1);
    expect(fronts(reduce(state, { type: 'undo', now: NOW }))).toEqual([]);
  });

  it('leaves a card added after the import alone', () => {
    // Snapshotting the whole list meant undoing the import also deleted work
    // done after it — the card typed by hand vanished with the deck.
    const state = run(blank(), importAction([imported('i1', 'imported')]), add('typed by hand'));
    expect(fronts(state)).toEqual(['imported', 'typed by hand']);

    expect(fronts(reduce(state, { type: 'undo', now: NOW }))).toEqual(['typed by hand']);
  });

  it('restores the previous version of a card it rewrote', () => {
    const base = run(blank(), importAction([{ ...imported('i1', 'old'), guid: 'g1' }]));
    const refreshed = reduce(base, importAction([], [{ ...imported('i1', 'new'), guid: 'g1' }]));
    expect(fronts(refreshed)).toEqual(['new']);

    const undone = reduce(refreshed, { type: 'undo', now: NOW });
    expect(fronts(undone)).toEqual(['old']);
    // Restored in place, not appended.
    expect(undone.data.cards).toHaveLength(1);
  });

  it('does nothing for an import that changed nothing', () => {
    const state = withCards('a');
    expect(reduce(state, importAction([]))).toBe(state);
    expect(selectCanUndo(reduce(state, importAction([])))).toBe(false);
  });
});
