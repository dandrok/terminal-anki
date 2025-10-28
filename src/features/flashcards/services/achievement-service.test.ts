import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initializeAchievements, checkAchievements } from './achievement-service';
import { Achievement, Flashcard, StudySessionRecord, LearningStreak } from '../domain';

describe('achievement-service', () => {
  let mockAchievements: Achievement[];
  let mockCards: Flashcard[];
  let mockSessionHistory: StudySessionRecord[];
  let mockLearningStreak: LearningStreak;
  let mockCurrentSession: StudySessionRecord;

  beforeEach(() => {
    vi.setSystemTime(new Date('2025-01-01T12:00:00.000Z'));

    mockAchievements = initializeAchievements();
    mockCards = [];
    mockSessionHistory = [];
    mockLearningStreak = {
      currentStreak: 0,
      longestStreak: 0,
      lastStudyDate: null,
      studyDates: [],
    };
    mockCurrentSession = {
      id: 's1',
      startTime: new Date(),
      endTime: new Date(),
      cardsStudied: 0,
      correctAnswers: 0,
      incorrectAnswers: 0,
      averageDifficulty: 0,
      sessionType: 'due',
      quitEarly: false,
    };
  });

  describe('initializeAchievements', () => {
    it('should return a predefined list of achievements', () => {
      const achievements = initializeAchievements();
      expect(achievements).toHaveLength(8);
      expect(achievements[0].id).toBe('first_card');
      expect(achievements[0].progress.current).toBe(0);
      expect(achievements[0].unlockedAt).toBeUndefined();
    });
  });

  describe('checkAchievements', () => {
    it('should unlock "first_card" achievement when 1 card is created', () => {
      mockCards.push({
        id: 'c1',
        front: 'Q',
        back: 'A',
        tags: [],
        easiness: 2.5,
        interval: 1,
        repetitions: 0,
        nextReview: new Date(),
        lastReview: null,
        createdAt: new Date(),
      });
      const updatedAchievements = checkAchievements(
        mockAchievements,
        mockCards,
        mockSessionHistory,
        mockLearningStreak,
        mockCurrentSession
      );
      const firstCardAch = updatedAchievements.find(a => a.id === 'first_card');
      expect(firstCardAch?.unlockedAt).toBeInstanceOf(Date);
      expect(firstCardAch?.progress.current).toBe(1);
    });

    it('should unlock "cards_10" achievement when 10 cards are created', () => {
      for (let i = 0; i < 10; i++) {
        mockCards.push({
          id: `c${i}`,
          front: 'Q',
          back: 'A',
          tags: [],
          easiness: 2.5,
          interval: 1,
          repetitions: 0,
          nextReview: new Date(),
          lastReview: null,
          createdAt: new Date(),
        });
      }
      const updatedAchievements = checkAchievements(
        mockAchievements,
        mockCards,
        mockSessionHistory,
        mockLearningStreak,
        mockCurrentSession
      );
      const cards10Ach = updatedAchievements.find(a => a.id === 'cards_10');
      expect(cards10Ach?.unlockedAt).toBeInstanceOf(Date);
      expect(cards10Ach?.progress.current).toBe(10);
    });

    it('should unlock "first_session" achievement after one session', () => {
      mockSessionHistory.push({ ...mockCurrentSession, cardsStudied: 1, correctAnswers: 1 });
      const updatedAchievements = checkAchievements(
        mockAchievements,
        mockCards,
        mockSessionHistory,
        mockLearningStreak,
        mockCurrentSession
      );
      const firstSessionAch = updatedAchievements.find(a => a.id === 'first_session');
      expect(firstSessionAch?.unlockedAt).toBeInstanceOf(Date);
      expect(firstSessionAch?.progress.current).toBe(1);
    });

    it('should unlock "sessions_10" achievement after 10 completed sessions', () => {
      for (let i = 0; i < 10; i++) {
        mockSessionHistory.push({ ...mockCurrentSession, id: `s${i}`, cardsStudied: 1, correctAnswers: 1 });
      }
      const updatedAchievements = checkAchievements(
        mockAchievements,
        mockCards,
        mockSessionHistory,
        mockLearningStreak,
        mockCurrentSession
      );
      const sessions10Ach = updatedAchievements.find(a => a.id === 'sessions_10');
      expect(sessions10Ach?.unlockedAt).toBeInstanceOf(Date);
      expect(sessions10Ach?.progress.current).toBe(10);
    });

    it('should unlock "reviews_100" achievement after 100 reviews', () => {
      mockCards.push({
        id: 'c1',
        front: 'Q',
        back: 'A',
        tags: [],
        easiness: 2.5,
        interval: 1,
        repetitions: 100, // Directly set to 100 for the test
        nextReview: new Date(),
        lastReview: null,
        createdAt: new Date(),
      });

      const updatedAchievements = checkAchievements(
        mockAchievements,
        mockCards,
        mockSessionHistory,
        mockLearningStreak,
        mockCurrentSession
      );
      const reviews100Ach = updatedAchievements.find(a => a.id === 'reviews_100');
      expect(reviews100Ach?.unlockedAt).toBeInstanceOf(Date);
      expect(reviews100Ach?.progress.current).toBe(100);
    });

    it('should unlock "streak_3" achievement for a 3-day streak', () => {
      mockLearningStreak.currentStreak = 3;
      const updatedAchievements = checkAchievements(
        mockAchievements,
        mockCards,
        mockSessionHistory,
        mockLearningStreak,
        mockCurrentSession
      );
      const streak3Ach = updatedAchievements.find(a => a.id === 'streak_3');
      expect(streak3Ach?.unlockedAt).toBeInstanceOf(Date);
      expect(streak3Ach?.progress.current).toBe(3);
    });

    it('should unlock "streak_7" achievement for a 7-day streak', () => {
      mockLearningStreak.currentStreak = 7;
      const updatedAchievements = checkAchievements(
        mockAchievements,
        mockCards,
        mockSessionHistory,
        mockLearningStreak,
        mockCurrentSession
      );
      const streak7Ach = updatedAchievements.find(a => a.id === 'streak_7');
      expect(streak7Ach?.unlockedAt).toBeInstanceOf(Date);
      expect(streak7Ach?.progress.current).toBe(7);
    });

    it('should unlock "accuracy_90" achievement for 90% accuracy', () => {
      mockCurrentSession.cardsStudied = 10;
      mockCurrentSession.correctAnswers = 9; // 90% accuracy
      const updatedAchievements = checkAchievements(
        mockAchievements,
        mockCards,
        mockSessionHistory,
        mockLearningStreak,
        mockCurrentSession
      );
      const accuracy90Ach = updatedAchievements.find(a => a.id === 'accuracy_90');
      expect(accuracy90Ach?.unlockedAt).toBeInstanceOf(Date);
      expect(accuracy90Ach?.progress.current).toBe(90);
    });

    it('should not unlock achievements if conditions are not met', () => {
      const updatedAchievements = checkAchievements(
        mockAchievements,
        mockCards,
        mockSessionHistory,
        mockLearningStreak,
        mockCurrentSession
      );
      updatedAchievements.forEach(ach => {
        expect(ach.unlockedAt).toBeUndefined();
      });
    });

    it('should not re-unlock already unlocked achievements', () => {
      const firstCardAch = mockAchievements.find(a => a.id === 'first_card');
      if (firstCardAch) {
        firstCardAch.unlockedAt = new Date('2024-01-01');
      }
      mockCards.push({
        id: 'c1',
        front: 'Q',
        back: 'A',
        tags: [],
        easiness: 2.5,
        interval: 1,
        repetitions: 0,
        nextReview: new Date(),
        lastReview: null,
        createdAt: new Date(),
      });
      const updatedAchievements = checkAchievements(
        mockAchievements,
        mockCards,
        mockSessionHistory,
        mockLearningStreak,
        mockCurrentSession
      );
      const recheckedAch = updatedAchievements.find(a => a.id === 'first_card');
      expect(recheckedAch?.unlockedAt?.toISOString()).toBe('2024-01-01T00:00:00.000Z');
    });
  });
});