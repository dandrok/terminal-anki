import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getBasicStats, getExtendedStats } from './stats-service';
import { Flashcard, StudySessionRecord, LearningStreak, Achievement } from '../domain';

describe('stats-service', () => {
  const now = new Date('2025-01-01T12:00:00.000Z');

  beforeEach(() => {
    vi.setSystemTime(now);
  });

  const createMockCard = (overrides: Partial<Flashcard> = {}): Flashcard => ({
    id: '1',
    front: 'Q',
    back: 'A',
    tags: [],
    easiness: 2.5,
    interval: 1,
    repetitions: 0,
    nextReview: new Date(now.getTime() - 1000), // Due
    lastReview: null,
    createdAt: new Date(now.getTime() - 100000),
    ...overrides,
  });

  const createMockSession = (overrides: Partial<StudySessionRecord> = {}): StudySessionRecord => ({
    id: 's1',
    startTime: new Date(now.getTime() - 60 * 60 * 1000),
    endTime: new Date(now.getTime()),
    cardsStudied: 10,
    correctAnswers: 8,
    incorrectAnswers: 2,
    averageDifficulty: 2,
    sessionType: 'due',
    quitEarly: false,
    ...overrides,
  });

  const mockLearningStreak: LearningStreak = {
    currentStreak: 5,
    longestStreak: 10,
    lastStudyDate: new Date(now.getTime() - 24 * 60 * 60 * 1000),
    studyDates: ['2024-12-27', '2024-12-28', '2024-12-29', '2024-12-30', '2024-12-31'],
  };

  const mockAchievements: Achievement[] = [
    {
      id: 'first_card',
      name: 'First Steps',
      description: 'Create your first flashcard',
      icon: '◎',
      category: 'cards',
      progress: { current: 1, required: 1, description: 'cards created' },
      unlockedAt: new Date(),
    },
  ];

  describe('getBasicStats', () => {
    it('should return correct basic stats for empty cards array', () => {
      const stats = getBasicStats([]);
      expect(stats).toEqual({
        totalCards: 0,
        dueCards: 0,
        totalReviews: 0,
        averageEasiness: 0,
        distribution: { new: 0, learning: 0, young: 0, mature: 0 },
      });
    });

    it('should return correct basic stats for a list of cards', () => {
      const cards = [
        createMockCard({ nextReview: new Date(now.getTime() + 100000), interval: 10 }), // Not due, young
        createMockCard({ nextReview: new Date(now.getTime() - 1000), interval: 0, repetitions: 5 }), // Due, new
        createMockCard({ nextReview: new Date(now.getTime() - 5000), interval: 30, repetitions: 10 }), // Due, mature
      ];
      const stats = getBasicStats(cards);

      expect(stats.totalCards).toBe(3);
      expect(stats.dueCards).toBe(2);
      expect(stats.totalReviews).toBe(15); // 0 + 5 + 10
      expect(stats.averageEasiness).toBe(2.5);
      expect(stats.distribution).toEqual({ new: 1, learning: 0, young: 2, mature: 0 });
    });
  });

  describe('getExtendedStats', () => {
    it('should return correct extended stats', () => {
      const cards = [
        createMockCard({ tags: ['js', 'web'] }),
        createMockCard({ tags: ['js', 'node'] }),
        createMockCard({ tags: ['python'] }),
      ];
      const sessionHistory = [
        createMockSession({ startTime: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000), endTime: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000), cardsStudied: 5, correctAnswers: 4 }), // 30 min
        createMockSession({ startTime: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), endTime: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000), cardsStudied: 10, correctAnswers: 9 }), // 30 min
        createMockSession({ quitEarly: true }), // Should not count towards completed sessions
      ];

      const stats = getExtendedStats(cards, sessionHistory, mockLearningStreak, mockAchievements);

      expect(stats.totalCards).toBe(3);
      expect(stats.learningStreak).toEqual(mockLearningStreak);
      expect(stats.totalStudyTime).toBe(60); // 30 + 30 minutes
      expect(stats.sessionsCompleted).toBe(2);
      expect(stats.averageSessionLength).toBe(30); // 60 / 2
      expect(stats.achievements).toEqual(mockAchievements);
      expect(stats.recentSessions).toHaveLength(2); // Only 2 valid sessions
      expect(stats.tagDistribution).toEqual({ js: 2, web: 1, node: 1, python: 1 });
      expect(stats.weeklyProgress).toHaveLength(4);
      expect(stats.weeklyProgress[3].week).toBe('Week 4'); // Current week
      expect(stats.weeklyProgress[3].cardsStudied).toBe(10); // From the second session
      expect(stats.weeklyProgress[3].accuracy).toBeCloseTo(90);
    });

    it('should handle empty session history for extended stats', () => {
      const cards = [createMockCard()];
      const stats = getExtendedStats(cards, [], mockLearningStreak, mockAchievements);

      expect(stats.totalStudyTime).toBe(0);
      expect(stats.sessionsCompleted).toBe(0);
      expect(stats.averageSessionLength).toBe(0);
      expect(stats.recentSessions).toHaveLength(0);
      expect(stats.weeklyProgress.every(w => w.cardsStudied === 0 && w.sessionCount === 0)).toBe(true);
    });

    it('should handle empty cards for tag distribution', () => {
      const stats = getExtendedStats([], [], mockLearningStreak, mockAchievements);
      expect(stats.tagDistribution).toEqual({});
    });
  });
});