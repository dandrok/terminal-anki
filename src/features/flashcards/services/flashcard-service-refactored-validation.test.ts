import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createFlashcardService } from './flashcard-service-refactored.js';
import { ValidationService } from '../../../shared/services/validation-service.js';

// Mock dependencies with validation service
const createMockDependencies = () => {
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
        studyDates: []
      },
      achievements: []
    }),
    saveData: vi.fn().mockResolvedValue(undefined),
    backupData: vi.fn().mockResolvedValue('backup-path'),
    restoreFromBackup: vi.fn().mockResolvedValue(undefined)
  };

  const mockSpacedRepetitionService = {
    name: 'MockSpacedRepetitionService',
    version: '1.0.0',
    calculateNextReview: vi.fn().mockImplementation((card, quality) => ({
      easiness: card.easiness + (quality >= 3 ? 0.1 : -0.1),
      interval: quality >= 3 ? card.interval * 2 : 1,
      repetitions: card.repetitions + (quality >= 3 ? 1 : 0),
      nextReview: new Date(Date.now() + 24 * 60 * 60 * 1000)
    })),
    getCardDifficulty: vi.fn().mockReturnValue('new' as const),
    isCardDue: vi.fn().mockReturnValue(false)
  };

  const mockAchievementService = {
    name: 'MockAchievementService',
    version: '1.0.0',
    checkAchievements: vi.fn().mockReturnValue([]),
    updateAchievement: vi.fn(),
    unlockAchievement: vi.fn(),
    getAllAchievements: vi.fn().mockReturnValue([])
  };

  const mockLearningStreakService = {
    name: 'MockLearningStreakService',
    version: '1.0.0',
    updateStreak: vi.fn().mockReturnValue({
      currentStreak: 1,
      longestStreak: 1,
      lastStudyDate: new Date(),
      studyDates: ['2025-01-01']
    }),
    getCurrentStreak: vi.fn().mockReturnValue(1),
    getLongestStreak: vi.fn().mockReturnValue(1),
    getStudyDates: vi.fn().mockReturnValue(['2025-01-01']),
    calculateStreak: vi.fn().mockReturnValue({ current: 1, longest: 1 })
  };

  const mockSessionService = {
    name: 'MockSessionService',
    version: '1.0.0',
    createSession: vi.fn().mockReturnValue({
      id: 'session-1',
      startTime: new Date(),
      type: 'due'
    }),
    endSession: vi.fn(),
    getCurrentSession: vi.fn().mockReturnValue(null),
    recordCardReview: vi.fn()
  };

  const validationService = new ValidationService();

  return {
    dataRepository: mockDataRepository,
    spacedRepetitionService: mockSpacedRepetitionService,
    achievementService: mockAchievementService,
    learningStreakService: mockLearningStreakService,
    sessionService: mockSessionService,
    validationService
  };
};

describe('FlashcardService Refactored with Validation', () => {
  let service: ReturnType<typeof createFlashcardService>;
  let mockDeps: ReturnType<typeof createMockDependencies>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDeps = createMockDependencies();
    service = createFlashcardService(mockDeps);
  });

  describe('Input Validation', () => {
    it('should validate flashcard creation inputs', () => {
      // Valid input should work
      expect(() => {
        service.addCard('Valid Question', 'Valid Answer', ['tag1', 'tag2']);
      }).not.toThrow();

      expect(mockDeps.dataRepository.saveData).toHaveBeenCalled();
    });

    it('should reject empty front text', () => {
      expect(() => {
        service.addCard('', 'Valid Answer', ['tag1']);
      }).toThrow('Validation failed');
    });

    it('should reject empty back text', () => {
      expect(() => {
        service.addCard('Valid Question', '', ['tag1']);
      }).toThrow('Validation failed');
    });

    it('should reject overly long front text', () => {
      const tooLongText = 'a'.repeat(1001);
      expect(() => {
        service.addCard(tooLongText, 'Valid Answer', ['tag1']);
      }).toThrow('Validation failed');
    });

    it('should reject invalid tags', () => {
      expect(() => {
        service.addCard('Valid Question', 'Valid Answer', ['valid', 123 as any]);
      }).toThrow('Validation failed');
    });

    it('should reject too many tags', () => {
      const tooManyTags = Array(21).fill('tag');
      expect(() => {
        service.addCard('Valid Question', 'Valid Answer', tooManyTags);
      }).toThrow('Validation failed');
    });

    it('should validate card update inputs', () => {
      const card = service.addCard('Question', 'Answer', ['tag1']);

      // Valid update should work
      expect(() => {
        service.updateCard(card.id, { front: 'Updated Question' });
      }).not.toThrow();

      expect(mockDeps.dataRepository.saveData).toHaveBeenCalledTimes(2);
    });

    it('should reject invalid card ID for update', () => {
      expect(() => {
        service.updateCard('invalid@id', { front: 'Updated' });
      }).toThrow('Validation failed');
    });

    it('should reject invalid update data', () => {
      const card = service.addCard('Question', 'Answer', ['tag1']);

      expect(() => {
        service.updateCard(card.id, { front: '' });
      }).toThrow('Validation failed');
    });

    it('should validate search query', () => {
      // Valid search should work
      expect(() => {
        service.searchCards('valid query');
      }).not.toThrow();

      // Empty search should fail
      expect(() => {
        service.searchCards('');
      }).toThrow('Validation failed');
    });

    it('should validate card review inputs', () => {
      const card = service.addCard('Question', 'Answer', ['tag1']);

      // Valid review should work
      expect(() => {
        service.reviewCard(card.id, 4);
      }).not.toThrow();

      expect(mockDeps.dataRepository.saveData).toHaveBeenCalledTimes(2);
    });

    it('should reject invalid card ID for review', () => {
      expect(() => {
        service.reviewCard('invalid@id', 4);
      }).toThrow('Validation failed');
    });

    it('should reject invalid review quality', () => {
      const card = service.addCard('Question', 'Answer', ['tag1']);

      expect(() => {
        service.reviewCard(card.id, 6 as any);
      }).toThrow('Validation failed');
    });

    it('should validate custom study filters', () => {
      // Valid filters should work
      const validFilters = {
        query: 'test',
        tags: ['tag1'],
        difficulty: 'new' as const,
        limit: 10,
        randomOrder: false
      };

      expect(() => {
        service.getFilteredCards(validFilters);
      }).not.toThrow();

      // Invalid difficulty should fail
      const invalidFilters = {
        difficulty: 'invalid' as any
      };

      expect(() => {
        service.getFilteredCards(invalidFilters);
      }).toThrow('Validation failed');
    });

    it('should validate session data recording', async () => {
      const validSessionData = {
        startTime: new Date(),
        endTime: new Date(),
        cardsStudied: 10,
        correctAnswers: 8,
        incorrectAnswers: 2,
        averageDifficulty: 2.5,
        duration: 300000,
        sessionType: 'due' as const,
        quitEarly: false,
        customStudyFilters: undefined
      };

      await expect(service.recordStudySession(validSessionData)).resolves.toBeDefined();
      expect(mockDeps.dataRepository.saveData).toHaveBeenCalled();
    });

    it('should reject invalid session data', async () => {
      const invalidSessionData = {
        startTime: new Date(),
        endTime: new Date(),
        cardsStudied: -5, // Negative number
        correctAnswers: 8,
        incorrectAnswers: 2,
        averageDifficulty: 2.5,
        duration: 300000,
        sessionType: 'due' as const,
        quitEarly: false,
        customStudyFilters: undefined
      };

      await expect(service.recordStudySession(invalidSessionData)).rejects.toThrow(
        /Invalid session data/
      );
    });

    it('should validate tag updates', () => {
      const card = service.addCard('Question', 'Answer', ['tag1']);

      // Valid tag update should work
      expect(() => {
        service.updateCardTags(card.id, ['new-tag1', 'new-tag2']);
      }).not.toThrow();

      expect(mockDeps.dataRepository.saveData).toHaveBeenCalledTimes(2);
    });

    it('should reject invalid tag updates', () => {
      const card = service.addCard('Question', 'Answer', ['tag1']);

      // Invalid card ID should fail
      expect(() => {
        service.updateCardTags('invalid@id', ['valid-tag']);
      }).toThrow('Invalid card ID');

      // Invalid tags should fail
      expect(() => {
        service.updateCardTags(card.id, ['valid-tag', 123 as any]);
      }).toThrow('Invalid tags');
    });
  });

  describe('Data Integrity', () => {
    it('should maintain data consistency after validation', () => {
      const card = service.addCard('Question', 'Answer', ['tag1', 'tag2']);

      // Update with valid data
      const updatedCard = service.updateCard(card.id, {
        front: 'Updated Question',
        tags: ['updated-tag']
      });

      expect(updatedCard).toBeTruthy();
      expect(updatedCard?.front).toBe('Updated Question');
      expect(updatedCard?.tags).toEqual(['updated-tag']);
    });

    it('should not modify data if validation fails', () => {
      const originalCard = service.addCard('Original Question', 'Original Answer', ['original']);

      // Attempt invalid update
      expect(() => {
        service.updateCard(originalCard.id, { front: '' });
      }).toThrow();

      // Verify original data is unchanged
      const retrievedCard = service.getCardById(originalCard.id);
      expect(retrievedCard?.front).toBe('Original Question');
    });
  });
});
