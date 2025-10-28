import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createFlashcardService } from './flashcard-service-refactored.js';
import { Flashcard, ReviewQuality } from '../domain';

// Mock dependencies
const mockDataRepository = {
  name: 'MockDataRepository',
  version: '1.0.0',
  loadData: vi.fn().mockResolvedValue({
    cards: [],
    sessionHistory: [],
    learningStreak: {
      currentStreak: 0,
      longestStreak: 0,
      lastStudyDate: null,
      studyDates: [],
    },
    achievements: [],
  }),
  saveData: vi.fn().mockResolvedValue(undefined),
  backupData: vi.fn().mockResolvedValue('backup-path'),
  restoreFromBackup: vi.fn().mockResolvedValue(undefined),
};

const mockSpacedRepetitionService = {
  name: 'MockSpacedRepetitionService',
  version: '1.0.0',
  calculateNextReview: vi.fn().mockImplementation((card, quality) => ({
    easiness: card.easiness + (quality >= 3 ? 0.1 : -0.1),
    interval: quality >= 3 ? card.interval * 2 : 1,
    repetitions: card.repetitions + (quality >= 3 ? 1 : 0),
    nextReview: new Date(Date.now() + 24 * 60 * 60 * 1000),
  })),
  getCardDifficulty: vi.fn().mockReturnValue('new' as const),
  isCardDue: vi.fn().mockReturnValue(false),
};

const mockAchievementService = {
  name: 'MockAchievementService',
  version: '1.0.0',
  checkAchievements: vi.fn().mockReturnValue([]),
  updateAchievement: vi.fn(),
  unlockAchievement: vi.fn(),
  getAllAchievements: vi.fn().mockReturnValue([]),
};

const mockLearningStreakService = {
  name: 'MockLearningStreakService',
  version: '1.0.0',
  updateStreak: vi.fn().mockReturnValue({
    currentStreak: 1,
    longestStreak: 1,
    lastStudyDate: new Date(),
    studyDates: ['2025-01-01'],
  }),
  getCurrentStreak: vi.fn().mockReturnValue(1),
  getLongestStreak: vi.fn().mockReturnValue(1),
  getStudyDates: vi.fn().mockReturnValue(['2025-01-01']),
  calculateStreak: vi.fn().mockReturnValue({ current: 1, longest: 1 }),
};

const mockSessionService = {
  name: 'MockSessionService',
  version: '1.0.0',
  createSession: vi.fn().mockReturnValue({
    id: 'session-1',
    startTime: new Date(),
    type: 'due',
  }),
  endSession: vi.fn(),
  getCurrentSession: vi.fn().mockReturnValue(null),
  recordCardReview: vi.fn(),
};

describe('FlashcardService Refactored', () => {
  let service: ReturnType<typeof createFlashcardService>;

  beforeEach(() => {
    vi.clearAllMocks();
    service = createFlashcardService({
      dataRepository: mockDataRepository,
      spacedRepetitionService: mockSpacedRepetitionService,
      achievementService: mockAchievementService,
      learningStreakService: mockLearningStreakService,
      sessionService: mockSessionService,
    });
  });

  describe('Basic Operations', () => {
    it('should create a service with correct metadata', () => {
      expect(service.name).toBe('FlashcardService');
      expect(service.version).toBe('2.0.0');
    });

    it('should start with empty state', () => {
      expect(service.getAllCards()).toHaveLength(0);
      expect(service.getCardStatistics().total).toBe(0);
    });

    it('should add a card successfully', () => {
      const card = service.addCard('Question', 'Answer', ['tag1', 'tag2']);

      expect(card.front).toBe('Question');
      expect(card.back).toBe('Answer');
      expect(card.tags).toEqual(['tag1', 'tag2']);
      expect(card.easiness).toBe(2.5);
      expect(card.repetitions).toBe(0);
      expect(card.id).toBeTruthy();

      expect(service.getAllCards()).toHaveLength(1);
      expect(mockDataRepository.saveData).toHaveBeenCalled();
    });

    it('should get a card by ID', () => {
      const card = service.addCard('Question', 'Answer');
      const found = service.getCardById(card.id);

      expect(found).toBeTruthy();
      expect(found?.id).toBe(card.id);
      expect(found?.front).toBe('Question');
    });

    it('should update a card successfully', () => {
      const card = service.addCard('Question', 'Answer');
      const updated = service.updateCard(card.id, {
        front: 'Updated Question',
        tags: ['new-tag'],
      });

      expect(updated).toBeTruthy();
      expect(updated?.front).toBe('Updated Question');
      expect(updated?.tags).toEqual(['new-tag']);

      const found = service.getCardById(card.id);
      expect(found?.front).toBe('Updated Question');
    });

    it('should delete a card successfully', () => {
      const card = service.addCard('Question', 'Answer');
      const wasDeleted = service.deleteCard(card.id);

      expect(wasDeleted).toBe(true);
      expect(service.getAllCards()).toHaveLength(0);
      expect(service.getCardById(card.id)).toBeUndefined();
    });

    it('should handle updating non-existent card', () => {
      const updated = service.updateCard('non-existent-id', { front: 'New' });
      expect(updated).toBeNull();
    });

    it('should handle deleting non-existent card', () => {
      const wasDeleted = service.deleteCard('non-existent-id');
      expect(wasDeleted).toBe(false);
    });
  });

  describe('Search and Filtering', () => {
    beforeEach(() => {
      service.addCard('Python', 'A programming language', ['programming']);
      service.addCard('JavaScript', 'A web programming language', ['programming', 'web']);
      service.addCard('HTML', 'HyperText Markup Language', ['web']);
      service.addCard('Machine Learning', 'A subset of AI', ['ai', 'data']);
    });

    it('should search cards by text', () => {
      const results = service.searchCards('programming');
      expect(results).toHaveLength(2);
      expect(results.every(card => card.front.toLowerCase().includes('programming') ||
                                     card.back.toLowerCase().includes('programming'))).toBe(true);
    });

    it('should get all unique tags', () => {
      const tags = service.getAllTags();
      expect(tags).toEqual(['ai', 'data', 'programming', 'web']);
    });

    it('should get cards by tag', () => {
      const programmingCards = service.getCardsByTag('programming');
      expect(programmingCards).toHaveLength(2);
      expect(programmingCards.every(card => card.tags.includes('programming'))).toBe(true);
    });

    it('should get cards by difficulty', () => {
      mockSpacedRepetitionService.getCardDifficulty.mockReturnValue('new' as const);
      const newCards = service.getCardsByDifficulty('new');
      expect(newCards).toHaveLength(4);
      expect(mockSpacedRepetitionService.getCardDifficulty).toHaveBeenCalled();
    });
  });

  describe('Card Review', () => {
    let card: Flashcard;

    beforeEach(() => {
      card = service.addCard('Question', 'Answer');
      mockSpacedRepetitionService.calculateNextReview.mockReturnValue({
        easiness: 2.6,
        interval: 2,
        repetitions: 1,
        nextReview: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });
    });

    it('should review a card successfully', () => {
      service.reviewCard(card.id, 4); // Good quality

      expect(mockSpacedRepetitionService.calculateNextReview).toHaveBeenCalledWith(card, 4);
      expect(mockDataRepository.saveData).toHaveBeenCalled();
      expect(mockLearningStreakService.updateStreak).toHaveBeenCalled();
    });

    it('should throw error when reviewing non-existent card', () => {
      expect(() => service.reviewCard('non-existent-id', 4)).toThrow(
        "Card with ID 'non-existent-id' not found"
      );
    });

    it('should record review in current session', () => {
      mockSessionService.getCurrentSession.mockReturnValue({
        id: 'session-1',
        startTime: new Date(),
        type: 'due',
        cardsStudied: 0,
        correctAnswers: 0,
        incorrectAnswers: 0,
      });

      service.reviewCard(card.id, 4);

      expect(mockSessionService.recordCardReview).toHaveBeenCalledWith('session-1', card.id, 4);
    });
  });

  describe('Statistics', () => {
    beforeEach(() => {
      service.addCard('Card 1', 'Answer 1');
      service.addCard('Card 2', 'Answer 2');
      service.addCard('Card 3', 'Answer 3');
    });

    it('should calculate basic statistics', () => {
      const stats = service.getCardStatistics();

      expect(stats.total).toBe(3);
      expect(stats.new).toBe(3); // All cards are new by default
      expect(stats.learning).toBe(0);
      expect(stats.young).toBe(0);
      expect(stats.mature).toBe(0);
    });

    it('should count due cards', () => {
      mockSpacedRepetitionService.isCardDue.mockReturnValue(true);
      mockSpacedRepetitionService.isCardDue.mockImplementation((card, date) => {
        return card.id === service.getAllCards()[0].id;
      });

      const dueCards = service.getDueCards();
      expect(dueCards).toHaveLength(1);
    });
  });

  describe('State Management', () => {
    it('should get current state', () => {
      service.addCard('Question', 'Answer');
      const state = service.getState();

      expect(state.cards).toHaveLength(1);
      expect(state.cards[0].front).toBe('Question');
    });

    it('should set new state', () => {
      const newState = {
        cards: [{ id: 'test', front: 'Test', back: 'Answer', tags: [], easiness: 2.5, interval: 1, repetitions: 0, nextReview: new Date(), lastReview: null, createdAt: new Date() }],
        sessionHistory: [],
        learningStreak: { currentStreak: 5, longestStreak: 10, lastStudyDate: new Date(), studyDates: ['2025-01-01'] },
        achievements: [],
      };

      service.setState(newState);

      expect(service.getAllCards()).toHaveLength(1);
      expect(service.getAllCards()[0].front).toBe('Test');
    });

    it('should reset state', () => {
      service.addCard('Question', 'Answer');
      service.resetState();

      expect(service.getAllCards()).toHaveLength(0);
    });

    it('should load state asynchronously', async () => {
      const mockData = {
        cards: [{ id: 'loaded', front: 'Loaded', back: 'Answer', tags: [], easiness: 2.5, interval: 1, repetitions: 0, nextReview: new Date(), lastReview: null, createdAt: new Date() }],
        sessionHistory: [],
        learningStreak: { currentStreak: 0, longestStreak: 0, lastStudyDate: null, studyDates: [] },
        achievements: [],
      };

      mockDataRepository.loadData.mockResolvedValue(mockData);

      await service.loadState();

      expect(service.getAllCards()).toHaveLength(1);
      expect(service.getAllCards()[0].front).toBe('Loaded');
    });
  });

  describe('Extended Functionality', () => {
    it('should update card tags', () => {
      const card = service.addCard('Question', 'Answer', ['old-tag']);
      const wasUpdated = service.updateCardTags(card.id, ['new-tag-1', 'new-tag-2']);

      expect(wasUpdated).toBe(true);
      const updatedCard = service.getCardById(card.id);
      expect(updatedCard?.tags).toEqual(['new-tag-1', 'new-tag-2']);
    });

    it('should handle updating tags for non-existent card', () => {
      const wasUpdated = service.updateCardTags('non-existent-id', ['tag']);
      expect(wasUpdated).toBe(false);
    });

    it('should record study session', () => {
      const sessionData = {
        startTime: new Date(),
        type: 'due' as const,
        cardsStudied: 10,
        correctAnswers: 8,
        incorrectAnswers: 2,
        averageDifficulty: 2.5,
        duration: 300000, // 5 minutes
      };

      const session = service.recordStudySession(sessionData);

      expect(session.id).toBeTruthy();
      expect(session.type).toBe('due');
      expect(session.cardsStudied).toBe(10);
      expect(mockSessionService.createSession).toHaveBeenCalledWith('due');
      expect(mockDataRepository.saveData).toHaveBeenCalled();
    });
  });
});