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
  | { type: 'card/delete'; id: string; now: Date }
  | {
      type: 'card/edit';
      id: string;
      front?: string;
      back?: string;
      tags?: readonly string[];
      now: Date;
    }
  | { type: 'card/grade'; id: string; quality: ReviewQuality; now: Date }
  /**
   * A whole import, applied at once.
   *
   * One action rather than a loop over `card/add`: a 3,000-card deck would
   * otherwise re-evaluate every achievement 3,000 times, write the file 3,000
   * times, and leave 3,000 entries in a 20-deep undo stack — so undoing an
   * import would be impossible by construction.
   */
  | { type: 'cards/import'; added: readonly Flashcard[]; updated: readonly Flashcard[]; now: Date }
  | { type: 'session/record'; session: Omit<StudySessionRecord, 'id'>; now: Date }
  | { type: 'session/clearUndo' }
  | { type: 'undo'; now: Date }
  | { type: 'seed'; cards: readonly Flashcard[] };

/** Restores what a single undoable action replaced. */
export type UndoEntry =
  | { kind: 'grade'; card: Flashcard }
  | { kind: 'delete'; card: Flashcard; index: number }
  | { kind: 'edit'; card: Flashcard }
  /**
   * Exactly what an import touched, and nothing else.
   *
   * Not a snapshot of the whole list: undoing an import would then also revert
   * anything done after it, so adding a card and then undoing the import
   * deleted the new card too.
   */
  | { kind: 'import'; addedIds: readonly string[]; replaced: readonly Flashcard[] };

export type { CustomStudyFilters };
