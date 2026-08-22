import { describe, expect, it } from 'vitest';
import {
  SCHEMA_VERSION,
  emptyPersistedData,
  normalizeAchievements,
  normalizePersistedData,
  normalizeStreak
} from '../../src/storage/serialization.js';
import { ACHIEVEMENT_IDS } from '../../src/core/achievements.js';

describe('normalizePersistedData', () => {
  it('accepts junk without throwing', () => {
    for (const input of [null, undefined, 42, 'text', [], { cards: 'nope' }]) {
      expect(() => normalizePersistedData(input)).not.toThrow();
    }
    expect(normalizePersistedData(null).cards).toEqual([]);
  });

  it('revives date fields into Date objects', () => {
    const data = normalizePersistedData({
      cards: [
        {
          id: '1',
          front: 'Q',
          back: 'A',
          nextReview: '2026-08-22T10:00:00.000Z',
          lastReview: '2026-08-21T10:00:00.000Z',
          createdAt: '2026-01-01T00:00:00.000Z'
        }
      ]
    });

    const card = data.cards[0];
    expect(card.nextReview).toBeInstanceOf(Date);
    expect(card.lastReview).toBeInstanceOf(Date);
    expect(card.createdAt).toBeInstanceOf(Date);
  });

  it('defaults tags for cards written before tags existed', () => {
    const data = normalizePersistedData({ cards: [{ id: '1', front: 'Q', back: 'A' }] });
    expect(data.cards[0].tags).toEqual([]);
  });

  it('lower-cases and de-duplicates stored tags', () => {
    const data = normalizePersistedData({
      cards: [{ id: '1', front: 'Q', back: 'A', tags: [' Web ', 'WEB', 'api'] }]
    });
    expect(data.cards[0].tags).toEqual(['web', 'api']);
  });

  it('drops entries that are not cards at all', () => {
    const data = normalizePersistedData({ cards: [null, 7, { front: '', back: '' }, 'x'] });
    expect(data.cards).toEqual([]);
  });

  it('repairs duplicate ids left behind by the old id scheme', () => {
    const data = normalizePersistedData({
      cards: [
        { id: '5', front: 'A', back: 'a' },
        { id: '5', front: 'B', back: 'b' }
      ]
    });
    expect(data.cards).toHaveLength(2);
    expect(data.cards[0].id).not.toBe(data.cards[1].id);
  });

  it('replaces a non-finite easiness with the default', () => {
    const data = normalizePersistedData({
      cards: [{ id: '1', front: 'Q', back: 'A', easiness: null, interval: 'x', repetitions: -3 }]
    });
    expect(data.cards[0].easiness).toBe(2.5);
    expect(data.cards[0].interval).toBe(1);
    expect(data.cards[0].repetitions).toBe(0);
  });

  it('stamps the current schema version', () => {
    expect(normalizePersistedData({}).version).toBe(SCHEMA_VERSION);
  });

  it('keeps correctAnswers within cardsStudied', () => {
    const data = normalizePersistedData({
      sessionHistory: [
        { startTime: '2026-08-20T10:00:00.000Z', cardsStudied: 5, correctAnswers: 99 }
      ]
    });
    expect(data.sessionHistory[0].correctAnswers).toBe(5);
    expect(data.sessionHistory[0].incorrectAnswers).toBe(0);
  });

  it('drops sessions with no usable start time', () => {
    expect(
      normalizePersistedData({ sessionHistory: [{ cardsStudied: 3 }] }).sessionHistory
    ).toEqual([]);
  });
});

describe('normalizeStreak', () => {
  it('fills in missing fields on a partial streak', () => {
    // Regression: a stored streak without studyDates threw on .includes().
    const streak = normalizeStreak({ currentStreak: 4 });
    expect(streak.studyDates).toEqual([]);
    expect(streak.longestStreak).toBe(0);
    expect(streak.lastStudyDate).toBeNull();
  });

  it('revives lastStudyDate', () => {
    expect(
      normalizeStreak({ lastStudyDate: '2026-08-22T00:00:00.000Z' }).lastStudyDate
    ).toBeInstanceOf(Date);
  });

  it('returns the empty streak for junk', () => {
    expect(normalizeStreak('nope')).toEqual({
      currentStreak: 0,
      longestStreak: 0,
      lastStudyDate: null,
      studyDates: []
    });
  });
});

describe('normalizeAchievements', () => {
  it('adds achievements missing from older saved data', () => {
    const result = normalizeAchievements([
      { id: 'first_card', unlockedAt: '2026-01-01T00:00:00.000Z' }
    ]);
    expect(result).toHaveLength(ACHIEVEMENT_IDS.length);
  });

  it('revives unlockedAt as a Date', () => {
    // The type claimed Date but a string was loaded straight off disk.
    const result = normalizeAchievements([
      { id: 'first_card', unlockedAt: '2026-01-01T00:00:00.000Z' }
    ]);
    const first = result.find(a => a.id === 'first_card')!;
    expect(first.unlockedAt).toBeInstanceOf(Date);
  });

  it('discards unknown achievement ids', () => {
    const result = normalizeAchievements([{ id: 'made_up', unlockedAt: '2026-01-01' }]);
    expect(result.some(a => a.id === 'made_up')).toBe(false);
  });
});

describe('emptyPersistedData', () => {
  it('includes the full achievement list', () => {
    expect(emptyPersistedData().achievements).toHaveLength(ACHIEVEMENT_IDS.length);
  });
});
