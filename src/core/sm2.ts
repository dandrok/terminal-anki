import { MS_PER_DAY, MS_PER_MINUTE } from './dates.js';
import type { DifficultyLevel, Flashcard, ReviewQuality } from '../types/index.js';

/** Easiness factor assigned to a brand new card. */
export const DEFAULT_EASINESS = 2.5;
/** SM-2 never lets the easiness factor drop below this. */
export const MIN_EASINESS = 1.3;
/** Grades at or above this count as a successful recall. */
export const PASSING_QUALITY = 3;
/** How soon a lapsed card comes back around. */
export const RELEARN_DELAY_MS = 10 * MS_PER_MINUTE;

/** The subset of a card that scheduling reads and writes. */
export interface SchedulingState {
  easiness: number;
  interval: number;
  repetitions: number;
  nextReview: Date;
  lastReview: Date | null;
}

/**
 * Apply one SM-2 review to a scheduling state and return the next one.
 *
 * Pure: the input is not mutated, which is what makes the algorithm testable
 * independently of storage and the terminal UI.
 */
export function schedule(
  state: SchedulingState,
  quality: ReviewQuality,
  now: Date = new Date()
): SchedulingState {
  const passed = quality >= PASSING_QUALITY;

  // SM-2 updates the easiness factor on every review, pass or fail, and uses
  // the *previous* interval and easiness to compute the next interval.
  const easiness = Math.max(
    MIN_EASINESS,
    state.easiness + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  );

  if (!passed) {
    return {
      easiness,
      interval: 1,
      repetitions: 0,
      nextReview: new Date(now.getTime() + RELEARN_DELAY_MS),
      lastReview: now
    };
  }

  const repetitions = state.repetitions + 1;
  let interval: number;
  if (repetitions === 1) {
    interval = 1;
  } else if (repetitions === 2) {
    interval = 6;
  } else {
    interval = Math.ceil(state.interval * state.easiness);
  }

  return {
    easiness,
    interval,
    repetitions,
    nextReview: new Date(now.getTime() + interval * MS_PER_DAY),
    lastReview: now
  };
}

/** Scheduling state for a card that has never been reviewed. */
export function initialSchedulingState(now: Date = new Date()): SchedulingState {
  return {
    easiness: DEFAULT_EASINESS,
    interval: 1,
    repetitions: 0,
    nextReview: new Date(now.getTime()),
    lastReview: null
  };
}

/** Bucket a card by how long its current interval is. */
export function difficultyOf(card: Pick<Flashcard, 'interval'>): DifficultyLevel {
  if (card.interval <= 1) {
    return 'new';
  }
  if (card.interval <= 7) {
    return 'learning';
  }
  if (card.interval <= 30) {
    return 'young';
  }
  return 'mature';
}

export function isDue(card: Pick<Flashcard, 'nextReview'>, now: Date = new Date()): boolean {
  return card.nextReview.getTime() <= now.getTime();
}
