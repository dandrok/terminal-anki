import { describe, expect, it } from 'vitest';
import { effectiveStreak, emptyStreak, recordStudyDay } from '../../src/core/streaks.js';
import type { LearningStreak } from '../../src/types/index.js';

const day = (d: number) => new Date(2026, 7, d, 12, 0, 0);

function streakOver(days: number[]): LearningStreak {
  return days.reduce<LearningStreak>((streak, d) => recordStudyDay(streak, day(d)), emptyStreak());
}

describe('recordStudyDay', () => {
  it('starts a streak at one', () => {
    const streak = recordStudyDay(emptyStreak(), day(10));
    expect(streak.currentStreak).toBe(1);
    expect(streak.longestStreak).toBe(1);
    expect(streak.studyDates).toEqual(['2026-08-10']);
  });

  it('extends the streak across consecutive days', () => {
    expect(streakOver([10, 11, 12]).currentStreak).toBe(3);
  });

  it('does not double-count two sessions on the same day', () => {
    const streak = streakOver([10, 10, 10]);
    expect(streak.currentStreak).toBe(1);
    expect(streak.studyDates).toEqual(['2026-08-10']);
  });

  it('restarts the streak after a gap', () => {
    expect(streakOver([10, 11, 12, 20]).currentStreak).toBe(1);
  });

  it('keeps the longest streak after a reset', () => {
    expect(streakOver([10, 11, 12, 20]).longestStreak).toBe(3);
  });

  it('records every distinct study date in order', () => {
    expect(streakOver([12, 10, 11]).studyDates).toEqual(['2026-08-10', '2026-08-11', '2026-08-12']);
  });

  it('leaves the running count alone for a backdated session', () => {
    const streak = recordStudyDay(streakOver([10, 11, 12]), day(5));
    expect(streak.currentStreak).toBe(3);
    expect(streak.lastStudyDate).toEqual(new Date(2026, 7, 12));
    expect(streak.studyDates).toContain('2026-08-05');
  });

  it('does not mutate the streak it is given', () => {
    const original = emptyStreak();
    recordStudyDay(original, day(10));
    expect(original).toEqual(emptyStreak());
  });
});

describe('effectiveStreak', () => {
  it('is zero when nothing has been studied', () => {
    expect(effectiveStreak(emptyStreak(), day(10))).toBe(0);
  });

  it('counts a streak studied today', () => {
    expect(effectiveStreak(streakOver([10, 11, 12]), day(12))).toBe(3);
  });

  it('still counts a streak last studied yesterday', () => {
    expect(effectiveStreak(streakOver([10, 11, 12]), day(13))).toBe(3);
  });

  it('reports zero once the streak has lapsed', () => {
    // A stored currentStreak kept its old value forever and was displayed as
    // if it were still running.
    expect(effectiveStreak(streakOver([10, 11, 12]), day(15))).toBe(0);
  });
});
