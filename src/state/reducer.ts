import { createAchievements, evaluateAchievements } from '../core/achievements.js';
import { normalizeTags } from '../core/filters.js';
import { mergeImport } from '../core/import.js';
import { createId } from '../core/ids.js';
import { initialSchedulingState, schedule } from '../core/sm2.js';
import { sessionAccuracy } from '../core/stats.js';
import { effectiveStreak, recordStudyDay } from '../core/streaks.js';
import type { Flashcard, PersistedData } from '../types/index.js';
import type { AppAction, UndoEntry } from './actions.js';

/** Sessions kept in history; older ones are dropped. */
export const MAX_SESSION_HISTORY = 1000;

/** How many actions can be undone within a run. */
export const MAX_UNDO_DEPTH = 20;

export interface AppState {
  readonly data: PersistedData;
  readonly undo: readonly UndoEntry[];
}

export function createInitialState(data: PersistedData): AppState {
  return { data, undo: [] };
}

function pushUndo(stack: readonly UndoEntry[], entry: UndoEntry): readonly UndoEntry[] {
  return [...stack, entry].slice(-MAX_UNDO_DEPTH);
}

/**
 * Recompute achievement progress from a snapshot of the collection.
 *
 * Runs over every definition rather than a hand-written list of checks, so an
 * achievement cannot be added and then silently never evaluated.
 */
function withAchievements(data: PersistedData, now: Date, sessionAccuracyPct: number | null) {
  const achievements = data.achievements.length > 0 ? data.achievements : createAchievements();

  return evaluateAchievements(
    achievements,
    {
      totalCards: data.cards.length,
      totalReviews: data.cards.reduce((sum, card) => sum + card.repetitions, 0),
      sessionsCompleted: data.sessionHistory.filter(entry => !entry.quitEarly).length,
      currentStreak: effectiveStreak(data.learningStreak, now),
      lastSessionAccuracy: sessionAccuracyPct
    },
    now
  );
}

/**
 * Apply an action's result, refreshing achievement progress.
 *
 * Every action that changes cards or history goes through here. Doing it only
 * on `card/add` and `session/record` left grading invisible to `reviews_100`
 * until a session was recorded, and deleting invisible to the card counts.
 */
function commit(
  data: PersistedData,
  now: Date,
  undo: readonly UndoEntry[],
  sessionAccuracyPct: number | null = null
): AppState {
  return {
    data: { ...data, achievements: withAchievements(data, now, sessionAccuracyPct) },
    undo
  };
}

/** Replace one card by id, leaving the array order intact. */
function replaceCard(cards: readonly Flashcard[], next: Flashcard): Flashcard[] {
  return cards.map(card => (card.id === next.id ? next : card));
}

/**
 * The single state transition function.
 *
 * Pure and immutable: never mutates `state` or anything reachable from it, and
 * always returns a fresh object when something changed. Both properties are
 * load-bearing — the Ink layer subscribes by snapshot identity, so an in-place
 * mutation would leave the screen silently frozen.
 */
export function reduce(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'seed': {
      const data = { ...state.data, cards: [...action.cards] };
      return { data, undo: [] };
    }

    case 'card/add': {
      const card: Flashcard = {
        id: createId(),
        front: action.front,
        back: action.back,
        tags: normalizeTags(action.tags),
        ...initialSchedulingState(action.now),
        createdAt: action.now
      };

      return commit({ ...state.data, cards: [...state.data.cards, card] }, action.now, state.undo);
    }

    case 'cards/import': {
      if (action.added.length === 0 && action.updated.length === 0) {
        return state;
      }

      const cards = mergeImport(state.data.cards, action.added, action.updated);

      // One undo entry for the whole import, because the stack is 20 deep and
      // a per-card entry would make undoing a 3,000-card deck impossible. It
      // records only what changed, so undo cannot reach past the import into
      // whatever happened after it.
      const replaced = action.updated
        .map(next => state.data.cards.find(card => card.id === next.id))
        .filter((card): card is Flashcard => card !== undefined);

      return commit(
        { ...state.data, cards },
        action.now,
        pushUndo(state.undo, {
          kind: 'import',
          addedIds: action.added.map(card => card.id),
          replaced
        })
      );
    }

    case 'card/delete': {
      const index = state.data.cards.findIndex(card => card.id === action.id);
      if (index === -1) {
        return state;
      }

      const card = state.data.cards[index];
      const cards = state.data.cards.filter(entry => entry.id !== action.id);
      return commit(
        { ...state.data, cards },
        action.now,
        // The original index is stored so undo restores position, not order.
        pushUndo(state.undo, { kind: 'delete', card, index })
      );
    }

    case 'card/edit': {
      const existing = state.data.cards.find(card => card.id === action.id);
      if (!existing) {
        return state;
      }

      const next: Flashcard = {
        ...existing,
        ...(action.front !== undefined ? { front: action.front } : {}),
        ...(action.back !== undefined ? { back: action.back } : {}),
        ...(action.tags !== undefined ? { tags: normalizeTags(action.tags) } : {})
      };

      return commit(
        { ...state.data, cards: replaceCard(state.data.cards, next) },
        action.now,
        pushUndo(state.undo, { kind: 'edit', card: existing })
      );
    }

    case 'card/grade': {
      const existing = state.data.cards.find(card => card.id === action.id);
      if (!existing) {
        return state;
      }

      const next: Flashcard = { ...existing, ...schedule(existing, action.quality, action.now) };
      return commit(
        { ...state.data, cards: replaceCard(state.data.cards, next) },
        action.now,
        // SM-2 is lossy (easiness is clamped, intervals are ceil'd), so the
        // prior card is snapshotted rather than inverted.
        pushUndo(state.undo, { kind: 'grade', card: existing })
      );
    }

    case 'session/record': {
      const session = { ...action.session, id: createId() };
      const sessionHistory = [...state.data.sessionHistory, session].slice(-MAX_SESSION_HISTORY);
      const learningStreak = recordStudyDay(state.data.learningStreak, session.startTime);

      // A graded card must not be undoable once its session is on record.
      return commit(
        { ...state.data, sessionHistory, learningStreak },
        action.now,
        [],
        sessionAccuracy(session)
      );
    }

    case 'session/clearUndo':
      return state.undo.length === 0 ? state : { ...state, undo: [] };

    case 'undo': {
      const entry = state.undo.at(-1);
      if (!entry) {
        return state;
      }

      const undo = state.undo.slice(0, -1);

      if (entry.kind === 'delete') {
        const cards = [...state.data.cards];
        cards.splice(Math.min(entry.index, cards.length), 0, entry.card);
        return commit({ ...state.data, cards }, action.now, undo);
      }

      // Remove exactly the cards the import added and restore exactly the ones
      // it rewrote, leaving everything else — including anything added since —
      // where it is.
      if (entry.kind === 'import') {
        const removed = new Set(entry.addedIds);
        const restore = new Map(entry.replaced.map(card => [card.id, card]));
        const cards = state.data.cards
          .filter(card => !removed.has(card.id))
          .map(card => restore.get(card.id) ?? card);
        return commit({ ...state.data, cards }, action.now, undo);
      }

      return commit(
        { ...state.data, cards: replaceCard(state.data.cards, entry.card) },
        action.now,
        undo
      );
    }
  }
}
