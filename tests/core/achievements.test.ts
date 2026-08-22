import { describe, expect, it } from 'vitest';
import {
  ACHIEVEMENT_IDS,
  createAchievements,
  evaluateAchievements,
  type AchievementContext
} from '../../src/core/achievements.js';

const NOW = new Date(2026, 7, 22, 12, 0);

function context(overrides: Partial<AchievementContext> = {}): AchievementContext {
  return {
    totalCards: 0,
    totalReviews: 0,
    sessionsCompleted: 0,
    currentStreak: 0,
    lastSessionAccuracy: null,
    ...overrides
  };
}

const find = (list: ReturnType<typeof createAchievements>, id: string) =>
  list.find(achievement => achievement.id === id)!;

describe('createAchievements', () => {
  it('starts every achievement locked with zero progress', () => {
    const achievements = createAchievements();
    expect(achievements).toHaveLength(ACHIEVEMENT_IDS.length);
    expect(achievements.every(a => a.unlockedAt === undefined)).toBe(true);
    expect(achievements.every(a => a.progress.current === 0)).toBe(true);
  });
});

describe('evaluateAchievements', () => {
  it('evaluates every defined achievement', () => {
    const result = evaluateAchievements(createAchievements(), context(), NOW);
    expect(result.map(a => a.id).sort()).toEqual([...ACHIEVEMENT_IDS].sort());
  });

  it('unlocks first_card once a card exists', () => {
    // Regression: nothing referenced 'first_card', so it could never unlock.
    const result = evaluateAchievements(createAchievements(), context({ totalCards: 1 }), NOW);
    expect(find(result, 'first_card').unlockedAt).toEqual(NOW);
  });

  it('tracks progress on achievements that stay locked', () => {
    const result = evaluateAchievements(createAchievements(), context({ totalCards: 4 }), NOW);
    const cards10 = find(result, 'cards_10');
    expect(cards10.unlockedAt).toBeUndefined();
    expect(cards10.progress.current).toBe(4);
  });

  it('records accuracy progress even when the target is missed', () => {
    // Progress used to be assigned only inside the unlock branch, so the bar
    // read 0/90 forever.
    const result = evaluateAchievements(
      createAchievements(),
      context({ lastSessionAccuracy: 72.4 }),
      NOW
    );
    expect(find(result, 'accuracy_90').progress.current).toBe(72);
    expect(find(result, 'accuracy_90').unlockedAt).toBeUndefined();
  });

  it('unlocks the accuracy achievement at ninety percent', () => {
    const result = evaluateAchievements(
      createAchievements(),
      context({ lastSessionAccuracy: 90 }),
      NOW
    );
    expect(find(result, 'accuracy_90').unlockedAt).toEqual(NOW);
  });

  it('does not let a weaker session pull peak progress back down', () => {
    const first = evaluateAchievements(
      createAchievements(),
      context({ lastSessionAccuracy: 80 }),
      NOW
    );
    const second = evaluateAchievements(first, context({ lastSessionAccuracy: 10 }), NOW);
    expect(find(second, 'accuracy_90').progress.current).toBe(80);
  });

  it('keeps the original unlock time on re-evaluation', () => {
    const earlier = new Date(2026, 0, 1);
    const first = evaluateAchievements(createAchievements(), context({ totalCards: 1 }), earlier);
    const second = evaluateAchievements(first, context({ totalCards: 50 }), NOW);
    expect(find(second, 'first_card').unlockedAt).toEqual(earlier);
  });

  it('never reports progress above the requirement', () => {
    const result = evaluateAchievements(createAchievements(), context({ totalReviews: 5000 }), NOW);
    expect(find(result, 'reviews_100').progress.current).toBe(100);
  });

  it('unlocks streak achievements at their thresholds', () => {
    const result = evaluateAchievements(createAchievements(), context({ currentStreak: 7 }), NOW);
    expect(find(result, 'streak_3').unlockedAt).toEqual(NOW);
    expect(find(result, 'streak_7').unlockedAt).toEqual(NOW);
  });

  it('rebuilds achievements that are missing from stored data', () => {
    const result = evaluateAchievements([], context({ totalCards: 1 }), NOW);
    expect(result).toHaveLength(ACHIEVEMENT_IDS.length);
  });

  it('does not mutate the list it is given', () => {
    const original = createAchievements();
    evaluateAchievements(original, context({ totalCards: 100 }), NOW);
    expect(original.every(a => a.unlockedAt === undefined)).toBe(true);
  });
});
