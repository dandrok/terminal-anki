import { daysBetween, startOfDay, toDateKey } from './dates.js';
import type { LearningStreak } from '../types/index.js';

export function emptyStreak(): LearningStreak {
  return {
    currentStreak: 0,
    longestStreak: 0,
    lastStudyDate: null,
    studyDates: []
  };
}

/**
 * Fold a study session's date into a streak, returning a new streak.
 *
 * Studying twice on the same day leaves the count unchanged; a one-day gap
 * extends it; a longer gap restarts it at 1.
 */
export function recordStudyDay(streak: LearningStreak, sessionDate: Date): LearningStreak {
  const day = startOfDay(sessionDate);
  const key = toDateKey(day);

  const studyDates = streak.studyDates.includes(key)
    ? [...streak.studyDates]
    : [...streak.studyDates, key].sort();

  let currentStreak: number;
  if (!streak.lastStudyDate) {
    currentStreak = 1;
  } else {
    const gap = daysBetween(streak.lastStudyDate, day);
    if (gap === 0) {
      currentStreak = Math.max(1, streak.currentStreak);
    } else if (gap === 1) {
      currentStreak = streak.currentStreak + 1;
    } else if (gap > 1) {
      currentStreak = 1;
    } else {
      // Backdated session: leave the running count alone.
      currentStreak = streak.currentStreak;
    }
  }

  const lastStudyDate =
    !streak.lastStudyDate || day.getTime() > streak.lastStudyDate.getTime()
      ? day
      : streak.lastStudyDate;

  return {
    currentStreak,
    longestStreak: Math.max(streak.longestStreak, currentStreak),
    lastStudyDate,
    studyDates
  };
}

/**
 * The streak as of `now`.
 *
 * A stored `currentStreak` keeps its last value forever, so a streak that
 * lapsed days ago would still be displayed as live. Anything older than
 * yesterday has already been broken.
 */
export function effectiveStreak(streak: LearningStreak, now: Date = new Date()): number {
  if (!streak.lastStudyDate) {
    return 0;
  }
  return daysBetween(streak.lastStudyDate, now) <= 1 ? streak.currentStreak : 0;
}
