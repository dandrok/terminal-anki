import type {
  CustomStudyFilters,
  Flashcard,
  ReviewQuality,
  StudySessionRecord
} from '../types/index.js';

/**
 * Every state transition in the application, as data.
 *
 * Actions carry a `now` where the outcome depends on the clock, so the reducer
 * stays a pure function of its inputs and tests never have to mock time.
 */
export type AppAction =
  | { type: 'card/add'; front: string; back: string; tags: readonly string[]; now: Date }
  | { type: 'card/delete'; id: string }
  | { type: 'card/edit'; id: string; front?: string; back?: string; tags?: readonly string[] }
  | { type: 'card/grade'; id: string; quality: ReviewQuality; now: Date }
  | { type: 'session/record'; session: Omit<StudySessionRecord, 'id'>; now: Date }
  | { type: 'session/clearUndo' }
  | { type: 'undo' }
  | { type: 'seed'; cards: readonly Flashcard[] };

/** Restores what a single undoable action replaced. */
export type UndoEntry =
  | { kind: 'grade'; card: Flashcard }
  | { kind: 'delete'; card: Flashcard; index: number }
  | { kind: 'edit'; card: Flashcard };

export type { CustomStudyFilters };
