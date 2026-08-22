import type { AppAction } from './actions.js';

export type WritePolicy = 'immediate' | 'deferred';

/** Idle time before a batch of deferred changes is flushed. */
export const FLUSH_IDLE_MS = 1000;

/** Force a flush once this many deferred actions have accumulated. */
export const FLUSH_AFTER_ACTIONS = 20;

/**
 * Decide when an action's result has to reach disk.
 *
 * Irreplaceable user content — cards and completed sessions — is always written
 * through. Grades are deferred because they are *derived* scheduling state: if
 * a hard kill loses the last few, those cards simply come due slightly wrong
 * and the next review corrects them.
 *
 * The reason this matters: v1 rewrote the whole file on every single grade. At
 * ~1 KB per card, a 5,000-card deck rewrote ~5 MB per keystroke.
 */
export function writePolicyFor(action: AppAction): WritePolicy {
  switch (action.type) {
    case 'card/add':
    case 'card/edit':
    case 'card/delete':
    case 'session/record':
    case 'seed':
      return 'immediate';
    // Undo can reverse a delete or an edit, both of which were written
    // through. Deferring it would leave the reversal only in memory, so a
    // crash inside the debounce window would resurrect the deletion.
    case 'undo':
      return 'immediate';
    case 'card/grade':
    case 'session/clearUndo':
      return 'deferred';
  }
}
