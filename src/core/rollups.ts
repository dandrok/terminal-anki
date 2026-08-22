import { toDateKey } from './dates.js';
import type { StudySessionRecord } from '../types/index.js';

/** What was studied on one calendar day. */
export interface DailyRollup {
  /** Local-calendar YYYY-MM-DD. */
  date: string;
  cardsStudied: number;
  correctAnswers: number;
  sessions: number;
  minutes: number;
}

export const EMPTY_ROLLUP: Omit<DailyRollup, 'date'> = {
  cardsStudied: 0,
  correctAnswers: 0,
  sessions: 0,
  minutes: 0
};

/**
 * Fold the session log into one entry per day.
 *
 * Derived on read rather than stored: keeping a rollup in the data file would
 * put computed state on disk, which then has to be rebuilt whenever the shape
 * changes. The event log is the source of truth and this is cheap over it.
 *
 * Date keys come from `toDateKey`, which formats the *local* calendar. Using
 * `toISOString()` here would bucket by UTC and put an evening session in the
 * wrong day for anyone east of Greenwich.
 */
export function dailyRollups(sessions: readonly StudySessionRecord[]): Map<string, DailyRollup> {
  const byDate = new Map<string, DailyRollup>();

  for (const session of sessions) {
    const date = toDateKey(session.startTime);
    const existing = byDate.get(date) ?? { date, ...EMPTY_ROLLUP };

    const elapsed = session.endTime
      ? Math.max(0, session.endTime.getTime() - session.startTime.getTime())
      : 0;

    byDate.set(date, {
      date,
      cardsStudied: existing.cardsStudied + session.cardsStudied,
      correctAnswers: existing.correctAnswers + session.correctAnswers,
      sessions: existing.sessions + 1,
      minutes: existing.minutes + elapsed / 60_000
    });
  }

  return byDate;
}

/** Accuracy across a set of rollups, 0-100. */
export function rollupAccuracy(rollups: readonly DailyRollup[]): number {
  const studied = rollups.reduce((sum, entry) => sum + entry.cardsStudied, 0);
  if (studied === 0) {
    return 0;
  }
  const correct = rollups.reduce((sum, entry) => sum + entry.correctAnswers, 0);
  return (correct / studied) * 100;
}
