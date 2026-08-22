import { describe, expect, it } from 'vitest';
import {
  cardDistribution,
  computeCardStats,
  sessionAccuracy,
  tagDistribution,
  totalStudyMinutes,
  weeklyProgress
} from '../../src/core/stats.js';
import { makeCard, makeSession } from '../helpers.js';

const NOW = new Date(2026, 7, 22, 12, 0);

describe('computeCardStats', () => {
  it('returns zeroed stats for an empty collection', () => {
    const stats = computeCardStats([], NOW);
    // Regression: this divided by zero and rendered a literal "NaN".
    expect(stats.averageEasiness).toBe(0);
    expect(Number.isNaN(stats.averageEasiness)).toBe(false);
    expect(stats).toMatchObject({ totalCards: 0, dueCards: 0, totalReviews: 0 });
  });

  it('averages easiness across the collection', () => {
    const stats = computeCardStats([makeCard({ easiness: 2 }), makeCard({ easiness: 3 })], NOW);
    expect(stats.averageEasiness).toBe(2.5);
  });

  it('sums repetitions into totalReviews', () => {
    const cards = [makeCard({ repetitions: 3 }), makeCard({ repetitions: 4 })];
    expect(computeCardStats(cards, NOW).totalReviews).toBe(7);
  });

  it('counts due cards against the supplied clock', () => {
    const cards = [
      makeCard({ nextReview: new Date(NOW.getTime() - 1) }),
      makeCard({ nextReview: new Date(NOW.getTime() + 1) })
    ];
    expect(computeCardStats(cards, NOW).dueCards).toBe(1);
  });
});

describe('cardDistribution', () => {
  it('buckets cards by interval', () => {
    const cards = [
      makeCard({ interval: 1 }),
      makeCard({ interval: 4 }),
      makeCard({ interval: 20 }),
      makeCard({ interval: 60 })
    ];
    expect(cardDistribution(cards)).toEqual({ new: 1, learning: 1, young: 1, mature: 1 });
  });
});

describe('tagDistribution', () => {
  it('counts cards per tag', () => {
    const cards = [makeCard({ tags: ['a', 'b'] }), makeCard({ tags: ['a'] })];
    expect(tagDistribution(cards)).toEqual({ a: 2, b: 1 });
  });
});

describe('totalStudyMinutes', () => {
  it('sums elapsed minutes', () => {
    const start = new Date(2026, 7, 20, 10, 0);
    const sessions = [
      makeSession({ startTime: start, endTime: new Date(start.getTime() + 5 * 60_000) }),
      makeSession({ startTime: start, endTime: new Date(start.getTime() + 15 * 60_000) })
    ];
    expect(totalStudyMinutes(sessions)).toBe(20);
  });

  it('skips sessions with no end time', () => {
    expect(totalStudyMinutes([makeSession({ endTime: undefined })])).toBe(0);
  });

  it('never counts negative time from a clock that went backwards', () => {
    const start = new Date(2026, 7, 20, 10, 0);
    const sessions = [
      makeSession({ startTime: start, endTime: new Date(start.getTime() - 60_000) })
    ];
    expect(totalStudyMinutes(sessions)).toBe(0);
  });
});

describe('sessionAccuracy', () => {
  it('reports the percentage correct', () => {
    expect(sessionAccuracy(makeSession({ cardsStudied: 10, correctAnswers: 9 }))).toBe(90);
  });

  it('is zero when no cards were studied', () => {
    expect(sessionAccuracy(makeSession({ cardsStudied: 0, correctAnswers: 0 }))).toBe(0);
  });
});

describe('weeklyProgress', () => {
  it('returns one entry per week, oldest first', () => {
    const weeks = weeklyProgress([], NOW);
    expect(weeks.map(week => week.week)).toEqual(['Week 1', 'Week 2', 'Week 3', 'Week 4']);
  });

  it('places a session from today in the most recent week', () => {
    const session = makeSession({ startTime: NOW, cardsStudied: 4, correctAnswers: 2 });
    const weeks = weeklyProgress([session], NOW);
    expect(weeks[3]).toMatchObject({ cardsStudied: 4, accuracy: 50, sessionCount: 1 });
  });

  it('includes a session recorded later today', () => {
    // The window used to end at local midnight, dropping the current day.
    const later = new Date(2026, 7, 22, 23, 30);
    const weeks = weeklyProgress([makeSession({ startTime: later, cardsStudied: 3 })], NOW);
    expect(weeks[3].sessionCount).toBe(1);
  });

  it('reports zero accuracy for a week with no cards studied', () => {
    expect(weeklyProgress([], NOW).every(week => week.accuracy === 0)).toBe(true);
  });
});
