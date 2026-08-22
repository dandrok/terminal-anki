import { describe, expect, it } from 'vitest';
import { dailyRollups, rollupAccuracy } from '../../src/core/rollups.js';
import { toDateKey } from '../../src/core/dates.js';
import type { StudySessionRecord } from '../../src/types/index.js';

function session(overrides: Partial<StudySessionRecord> = {}): StudySessionRecord {
  const startTime = overrides.startTime ?? new Date(2026, 7, 22, 10, 0);
  return {
    id: Math.random().toString(36).slice(2),
    startTime,
    endTime: new Date(startTime.getTime() + 6 * 60_000),
    cardsStudied: 10,
    correctAnswers: 8,
    incorrectAnswers: 2,
    averageDifficulty: 3,
    sessionType: 'due',
    quitEarly: false,
    ...overrides
  };
}

describe('dailyRollups', () => {
  it('returns nothing for an empty log', () => {
    expect(dailyRollups([]).size).toBe(0);
  });

  it('sums several sessions on the same day', () => {
    const rollups = dailyRollups([
      session({ startTime: new Date(2026, 7, 22, 8, 0), cardsStudied: 5, correctAnswers: 4 }),
      session({ startTime: new Date(2026, 7, 22, 20, 0), cardsStudied: 7, correctAnswers: 3 })
    ]);

    expect(rollups.size).toBe(1);
    const day = rollups.get('2026-08-22');
    expect(day).toMatchObject({
      date: '2026-08-22',
      cardsStudied: 12,
      correctAnswers: 7,
      sessions: 2
    });
    expect(day?.minutes).toBeCloseTo(12);
  });

  it('keeps separate days apart', () => {
    const rollups = dailyRollups([
      session({ startTime: new Date(2026, 7, 21, 23, 0) }),
      session({ startTime: new Date(2026, 7, 22, 1, 0) })
    ]);
    expect([...rollups.keys()].sort()).toEqual(['2026-08-21', '2026-08-22']);
  });

  it('buckets a late-evening session by the local calendar day', () => {
    // toISOString() would push 23:30 local into the next UTC day anywhere west
    // of Greenwich and the previous one east of it. This is the pomo_doro bug.
    const late = new Date(2026, 7, 22, 23, 30);
    const rollups = dailyRollups([session({ startTime: late })]);
    expect([...rollups.keys()]).toEqual([toDateKey(late)]);
    expect([...rollups.keys()]).toEqual(['2026-08-22']);
  });

  it('counts an unfinished session with zero minutes rather than NaN', () => {
    const rollups = dailyRollups([session({ endTime: undefined })]);
    expect(rollups.get('2026-08-22')?.minutes).toBe(0);
    expect(rollups.get('2026-08-22')?.sessions).toBe(1);
  });

  it('never reports negative minutes when the clock jumped backwards', () => {
    const start = new Date(2026, 7, 22, 10, 0);
    const rollups = dailyRollups([
      session({ startTime: start, endTime: new Date(start.getTime() - 60_000) })
    ]);
    expect(rollups.get('2026-08-22')?.minutes).toBe(0);
  });
});

describe('rollupAccuracy', () => {
  it('is zero when nothing was studied', () => {
    expect(rollupAccuracy([])).toBe(0);
    expect(
      rollupAccuracy([{ date: 'x', cardsStudied: 0, correctAnswers: 0, sessions: 0, minutes: 0 }])
    ).toBe(0);
  });

  it('weights by cards rather than averaging day percentages', () => {
    // 1/1 on one day and 0/99 on another is 1%, not 50%.
    const accuracy = rollupAccuracy([
      { date: 'a', cardsStudied: 1, correctAnswers: 1, sessions: 1, minutes: 1 },
      { date: 'b', cardsStudied: 99, correctAnswers: 0, sessions: 1, minutes: 1 }
    ]);
    expect(accuracy).toBeCloseTo(1);
  });
});
