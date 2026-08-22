import { describe, expect, it } from 'vitest';
import {
  DEFAULT_EASINESS,
  MIN_EASINESS,
  RELEARN_DELAY_MS,
  difficultyOf,
  initialSchedulingState,
  isDue,
  schedule,
  type SchedulingState
} from '../../src/core/sm2.js';
import { MS_PER_DAY } from '../../src/core/dates.js';

const NOW = new Date('2026-03-01T10:00:00Z');

function fresh(overrides: Partial<SchedulingState> = {}): SchedulingState {
  return { ...initialSchedulingState(NOW), ...overrides };
}

describe('schedule', () => {
  it('does not mutate the state it is given', () => {
    const state = fresh();
    const snapshot = { ...state };
    schedule(state, 5, NOW);
    expect(state).toEqual(snapshot);
  });

  it('uses a 1-day interval on the first successful review', () => {
    const next = schedule(fresh(), 4, NOW);
    expect(next.repetitions).toBe(1);
    expect(next.interval).toBe(1);
    expect(next.nextReview.getTime()).toBe(NOW.getTime() + MS_PER_DAY);
  });

  it('uses a 6-day interval on the second successful review', () => {
    const next = schedule(fresh({ repetitions: 1, interval: 1 }), 4, NOW);
    expect(next.repetitions).toBe(2);
    expect(next.interval).toBe(6);
  });

  it('multiplies by the previous easiness from the third review on', () => {
    const state = fresh({ repetitions: 2, interval: 6, easiness: 2.5 });
    const next = schedule(state, 4, NOW);
    expect(next.interval).toBe(Math.ceil(6 * 2.5));
  });

  it.each([0, 1, 2] as const)('resets progress on a failing grade of %i', quality => {
    const state = fresh({ repetitions: 7, interval: 40 });
    const next = schedule(state, quality, NOW);

    expect(next.repetitions).toBe(0);
    expect(next.interval).toBe(1);
    expect(next.nextReview.getTime()).toBe(NOW.getTime() + RELEARN_DELAY_MS);
  });

  it('raises easiness for a perfect grade and lowers it for a poor one', () => {
    expect(schedule(fresh(), 5, NOW).easiness).toBeGreaterThan(DEFAULT_EASINESS);
    expect(schedule(fresh(), 3, NOW).easiness).toBeLessThan(DEFAULT_EASINESS);
  });

  it('never lets easiness fall below the SM-2 floor', () => {
    let state = fresh();
    for (let i = 0; i < 25; i++) {
      state = schedule(state, 0, NOW);
    }
    expect(state.easiness).toBe(MIN_EASINESS);
  });

  it('records the review time', () => {
    expect(schedule(fresh(), 4, NOW).lastReview).toEqual(NOW);
  });
});

describe('difficultyOf', () => {
  it.each([
    [0, 'new'],
    [1, 'new'],
    [2, 'learning'],
    [7, 'learning'],
    [8, 'young'],
    [30, 'young'],
    [31, 'mature']
  ])('classifies an interval of %i days as %s', (interval, expected) => {
    expect(difficultyOf({ interval })).toBe(expected);
  });
});

describe('isDue', () => {
  it('treats a review time in the past or exactly now as due', () => {
    expect(isDue({ nextReview: new Date(NOW.getTime() - 1) }, NOW)).toBe(true);
    expect(isDue({ nextReview: NOW }, NOW)).toBe(true);
  });

  it('treats a future review time as not due', () => {
    expect(isDue({ nextReview: new Date(NOW.getTime() + 1) }, NOW)).toBe(false);
  });
});
