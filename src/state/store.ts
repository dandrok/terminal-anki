import { initialSchedulingState } from '../core/sm2.js';
import { normalizeTags } from '../core/filters.js';
import { createId } from '../core/ids.js';
import {
  createRepository,
  type Repository,
  type RepositoryOptions
} from '../storage/repository.js';
import type { Flashcard } from '../types/index.js';
import type { AppAction } from './actions.js';
import { FLUSH_AFTER_ACTIONS, FLUSH_IDLE_MS, writePolicyFor } from './persistence.js';
import { createInitialState, reduce, type AppState } from './reducer.js';

const SAMPLE_CARDS: readonly { front: string; back: string; tags: string[] }[] = [
  { front: 'Python', back: 'A high-level programming language', tags: ['programming', 'python'] },
  {
    front: 'Algorithm',
    back: 'A step-by-step procedure for solving a problem',
    tags: ['computer-science', 'algorithms']
  },
  {
    front: 'Database',
    back: 'An organized collection of structured information',
    tags: ['database', 'storage']
  },
  { front: 'API', back: 'Application Programming Interface', tags: ['programming', 'web'] },
  { front: 'Git', back: 'A distributed version control system', tags: ['tools', 'version-control'] }
];

export interface StoreOptions extends RepositoryOptions {
  /** Seed sample cards when there is no data file yet. Defaults to true. */
  seedSampleCards?: boolean;
  /** Substitute repository, for tests. */
  repository?: Repository;
  /**
   * Called when a write fails somewhere with no caller able to handle it — a
   * keypress handler or the debounce timer. The data stays pending and a retry
   * is armed; this is purely how the failure gets reported.
   */
  onWriteError?: (error: unknown) => void;
}

export interface Store {
  readonly dataFile: string;
  /** Current snapshot. Identity changes only when state actually changed. */
  getSnapshot: () => AppState;
  /** Subscribe to snapshot changes; returns an unsubscribe function. */
  subscribe: (listener: () => void) => () => void;
  dispatch: (action: AppAction) => void;
  /** Write any pending changes now. Safe to call from an exit handler. */
  flush: () => void;
  /** Re-read from disk, discarding undo history. */
  reload: () => void;
  /** Flush, cancel timers and release listeners. Never throws. */
  dispose: () => void;
}

function buildSampleCards(now: Date): Flashcard[] {
  return SAMPLE_CARDS.map(sample => ({
    id: createId(),
    front: sample.front,
    back: sample.back,
    tags: normalizeTags(sample.tags),
    ...initialSchedulingState(now),
    createdAt: now
  }));
}

/**
 * Owns application state and decides when it reaches disk.
 *
 * Framework-free on purpose: it imports nothing from React or Ink, so tests can
 * drive it directly, and `flush()` can run from a signal handler where a React
 * effect could not.
 *
 * `getSnapshot`/`subscribe` match the `useSyncExternalStore` contract exactly.
 */
export function createStore(options: StoreOptions = {}): Store {
  const {
    seedSampleCards = true,
    repository: injected,
    onWriteError = (error: unknown) => console.error(error),
    ...repositoryOptions
  } = options;
  const repository = injected ?? createRepository(repositoryOptions);

  const result = repository.load();
  let state = createInitialState(result.data);

  const listeners = new Set<() => void>();
  let pendingWrites = 0;
  let flushTimer: NodeJS.Timeout | null = null;

  const cancelTimer = (): void => {
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
  };

  const flush = (): void => {
    cancelTimer();
    if (pendingWrites === 0) {
      return;
    }

    try {
      repository.save(state.data);
    } catch (error) {
      // Keep the pending count and re-arm the timer: clearing it here would
      // silently discard changes that never reached disk.
      scheduleFlush();
      throw error;
    }

    pendingWrites = 0;
  };

  /**
   * Flush where there is nobody to catch a failure.
   *
   * A timer callback and a keypress handler both sit at a boundary with no
   * caller, so throwing there is an unhandled exception — losing the whole
   * session to a transient disk error. `flush` has already retained the pending
   * count and re-armed the timer, so reporting is all that is left to do.
   */
  const flushSafely = (): void => {
    try {
      flush();
    } catch (error) {
      onWriteError(error);
    }
  };

  const scheduleFlush = (): void => {
    cancelTimer();
    // unref so a pending flush can never hold the process open on exit.
    flushTimer = setTimeout(flushSafely, FLUSH_IDLE_MS);
    flushTimer.unref?.();
  };

  const notify = (): void => {
    for (const listener of listeners) {
      listener();
    }
  };

  const dispatch = (action: AppAction): void => {
    const next = reduce(state, action);
    if (next === state) {
      return;
    }
    state = next;

    pendingWrites++;

    try {
      // Bound worst-case loss by count as well as by time, so fast grading
      // cannot defer indefinitely.
      if (writePolicyFor(action) === 'immediate' || pendingWrites >= FLUSH_AFTER_ACTIONS) {
        flushSafely();
      } else {
        scheduleFlush();
      }
    } finally {
      // Subscribers must learn about the new state even if persistence failed:
      // it is already the truth in memory, and a screen left showing the old
      // value is a second bug on top of the first.
      notify();
    }
  };

  // Sample cards seed a first run only. They are deliberately not re-created
  // when the collection is merely empty, which used to resurrect them on every
  // launch after the user deleted their last card. A read-only repository means
  // unreadable data could not be preserved, so nothing is seeded over it either.
  if (result.isNew && seedSampleCards && !result.corruptBackup && !repository.isReadOnly()) {
    dispatch({ type: 'seed', cards: buildSampleCards(new Date()) });
  }
  // A migration is persisted by the repository's own load(), which owns copying
  // the legacy file into its new home. Saving again here would double-write.

  return {
    dataFile: repository.dataFile,
    getSnapshot: () => state,
    subscribe: listener => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dispatch,
    flush,
    reload: () => {
      flush();
      state = createInitialState(repository.load().data);
      notify();
    },
    dispose: () => {
      // flush() re-arms the timer on failure and rethrows; neither is wanted
      // here. Disposal must not leave a live timer behind, and must not let a
      // write error stop the listeners being released.
      try {
        flushSafely();
      } finally {
        cancelTimer();
        listeners.clear();
      }
    }
  };
}
