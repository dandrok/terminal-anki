import {
  Flashcard,
  CustomStudyFilters,
  ReviewQuality,
  StudySessionRecord,
  LearningStreak,
  Achievement
} from '../domain';
import {
  IFlashcardService,
  IDataRepository,
  ISpacedRepetitionService,
  IAchievementService,
  ILearningStreakService,
  ISessionService,
  IValidationService
} from '../../../shared/interfaces/services.js';
import { Result, Ok, Err } from '../../../shared/utils/result-type.js';
import { filterCards } from '../filtering';
import { CommonValidators } from '../../../shared/utils/validation-middleware.js';

/**
 * Flashcard Service Implementation - Refactored with DI
 * This is a cleaner, more maintainable version using dependency injection
 * and functional state management patterns
 */

export interface FlashcardServiceState {
  cards: Flashcard[];
  sessionHistory: StudySessionRecord[];
  learningStreak: LearningStreak;
  achievements: Achievement[];
}

export interface FlashcardServiceDependencies {
  dataRepository: IDataRepository;
  spacedRepetitionService: ISpacedRepetitionService;
  achievementService: IAchievementService;
  learningStreakService: ILearningStreakService;
  sessionService: ISessionService;
  validationService: IValidationService;
}

/**
 * Create a new flashcard service instance with functional state management
 */
export function createFlashcardService(
  dependencies: FlashcardServiceDependencies,
  initialState?: FlashcardServiceState
): IFlashcardService {
  const {
    dataRepository,
    spacedRepetitionService,
    achievementService,
    learningStreakService,
    sessionService,
    validationService
  } = dependencies;

  // Common validators
  const validators = new CommonValidators(validationService);

  // State management
  let state: FlashcardServiceState = initialState || {
    cards: [],
    sessionHistory: [],
    learningStreak: {
      currentStreak: 0,
      longestStreak: 0,
      lastStudyDate: null,
      studyDates: []
    },
    achievements: []
  };

  // Private state management functions
  const saveStateInternal = async (): Promise<void> => {
    try {
      await dataRepository.saveData(state);
    } catch (error) {
      console.error('Failed to save flashcard state:', error);
      throw error;
    }
  };

  const loadStateInternal = async (): Promise<void> => {
    try {
      const data = await dataRepository.loadData();
      state = {
        cards: data.cards,
        sessionHistory: data.sessionHistory,
        learningStreak: data.learningStreak,
        achievements: data.achievements
      };
    } catch (error) {
      console.error('Failed to load flashcard state:', error);
      throw error;
    }
  };

  const checkAndUnlockAchievements = (
    sessionData?: StudySessionRecord | null
  ): void => {
    try {
      const stats = {
        total: state.cards.length,
        due: state.cards.filter(card => spacedRepetitionService.isCardDue(card)).length,
        new: state.cards.filter(card => spacedRepetitionService.getCardDifficulty(card) === 'new')
          .length,
        learning: state.cards.filter(
          card => spacedRepetitionService.getCardDifficulty(card) === 'learning'
        ).length,
        young: state.cards.filter(
          card => spacedRepetitionService.getCardDifficulty(card) === 'young'
        ).length,
        mature: state.cards.filter(
          card => spacedRepetitionService.getCardDifficulty(card) === 'mature'
        ).length
      };
      const currentSession = sessionData ?? sessionService.getCurrentSession();

      if (currentSession) {
        const newAchievements = achievementService.checkAchievements(
          currentSession,
          stats
        );
        for (const achievement of newAchievements) {
          achievementService.updateAchievement(achievement.id, achievement);
        }
      }
    } catch (error) {
      console.error('Failed to check achievements:', error);
    }
  };

  const shuffleArray = <T>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Public service interface
  const service: IFlashcardService = {
    name: 'FlashcardService',
    version: '2.0.0',

    // Basic card operations
    getAllCards(): Flashcard[] {
      return [...state.cards];
    },

    getDueCards(referenceDate: Date = new Date()): Flashcard[] {
      return state.cards.filter(card => spacedRepetitionService.isCardDue(card, referenceDate));
    },

    getCardById(id: string): Flashcard | undefined {
      return state.cards.find(card => card.id === id);
    },

    addCard(front: string, back: string, tags: string[] = []): Flashcard {
      // Validate inputs
      const validation = validators.validateFlashcardCreation(front, back, tags);
      if (!validation.success) {
        throw new Error(validation.error.message);
      }

      const validatedData = validation.data;
      const newCard: Flashcard = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        front: validatedData.front,
        back: validatedData.back,
        tags: validatedData.tags,
        easiness: 2.5,
        interval: 1,
        repetitions: 0,
        nextReview: new Date(),
        lastReview: null,
        createdAt: new Date()
      };

      state.cards.push(newCard);
      saveStateInternal();
      checkAndUnlockAchievements();

      return newCard;
    },

    updateCard(id: string, updates: Partial<Flashcard>): Flashcard | null {
      // Validate inputs
      const validation = validators.validateCardUpdate(id, updates);
      if (!validation.success) {
        throw new Error(validation.error.message);
      }

      const cardIndex = state.cards.findIndex(card => card.id === id);
      if (cardIndex === -1) {
        return null;
      }

      const validatedUpdates = validation.data.updates;
      const updatedCard = { ...state.cards[cardIndex], ...validatedUpdates };
      state.cards[cardIndex] = updatedCard;
      saveStateInternal();

      return updatedCard;
    },

    deleteCard(id: string): boolean {
      const initialLength = state.cards.length;
      state.cards = state.cards.filter(card => card.id !== id);
      const wasDeleted = state.cards.length < initialLength;

      if (wasDeleted) {
        saveStateInternal();
      }

      return wasDeleted;
    },

    // Search and filtering
    searchCards(query: string): Flashcard[] {
      // Validate query
      const validation = validators.validateSearchQuery(query);
      if (!validation.success) {
        throw new Error(validation.error.message);
      }

      const validatedQuery = validation.data.query;
      const lowerQuery = validatedQuery.toLowerCase();
      return state.cards.filter(
        card =>
          card.front.toLowerCase().includes(lowerQuery) ||
          card.back.toLowerCase().includes(lowerQuery) ||
          card.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
      );
    },

    getFilteredCards(filters: CustomStudyFilters): Flashcard[] {
      // Validate filters
      const validation = validators.validateCustomStudyFilters(filters);
      if (!validation.success) {
        throw new Error(validation.error.message);
      }

      const validatedFilters = validation.data.filters;
      let filtered = filterCards(state.cards, {
        query: validatedFilters.query,
        tags: validatedFilters.tags,
        difficulty: validatedFilters.difficulty,
        includeDue: validatedFilters.includeDue
      });

      // Apply limit
      if (validatedFilters.limit && validatedFilters.limit > 0) {
        filtered = filtered.slice(0, validatedFilters.limit);
      }

      // Apply random order if requested
      if (validatedFilters.randomOrder) {
        filtered = shuffleArray(filtered);
      }

      return filtered;
    },

    // Review operations
    reviewCard(id: string, quality: ReviewQuality): void {
      // Validate inputs
      const validation = validators.validateCardReview(id, quality);
      if (!validation.success) {
        throw new Error(validation.error.message);
      }

      const validatedData = validation.data;
      const cardIndex = state.cards.findIndex(card => card.id === validatedData.cardId);
      if (cardIndex === -1) {
        throw new Error(`Card with ID '${validatedData.cardId}' not found`);
      }

      const card = state.cards[cardIndex];
      const reviewResult = spacedRepetitionService.calculateNextReview(card, validatedData.quality);

      // Update the card with new values
      state.cards[cardIndex] = {
        ...card,
        ...reviewResult,
        lastReview: new Date()
      };

      saveStateInternal();

      // Record the review in the current session if one exists
      const currentSession = sessionService.getCurrentSession();
      if (currentSession) {
        sessionService.recordCardReview(
          currentSession.id,
          validatedData.cardId,
          validatedData.quality
        );
      }

      // Check for achievements and update learning streak
      checkAndUnlockAchievements(currentSession);
      learningStreakService.updateStreak(new Date());
    },

    // Statistics
    getCardStatistics(): {
      total: number;
      due: number;
      new: number;
      learning: number;
      young: number;
      mature: number;
    } {
      const stats = {
        total: state.cards.length,
        due: this.getDueCards().length,
        new: 0,
        learning: 0,
        young: 0,
        mature: 0
      };

      for (const card of state.cards) {
        const difficulty = spacedRepetitionService.getCardDifficulty(card);
        stats[difficulty]++;
      }

      return stats;
    },

    getCardsByTag(tag: string): Flashcard[] {
      return state.cards.filter(card => card.tags.includes(tag.toLowerCase()));
    },

    getCardsByDifficulty(difficulty: 'new' | 'learning' | 'young' | 'mature'): Flashcard[] {
      return state.cards.filter(card => {
        const cardDifficulty = spacedRepetitionService.getCardDifficulty(card);
        return cardDifficulty === difficulty;
      });
    },

    updateCardTags(cardId: string, tags: string[]): boolean {
      const idValidation = validationService.validateCardId(cardId);
      if (!idValidation.isValid) {
        throw new Error(`Invalid card ID: ${idValidation.errors.join(', ')}`);
      }

      const tagsValidation = validationService.validateStringArray(tags, 20, 50);
      if (!tagsValidation.isValid) {
        throw new Error(`Invalid tags: ${tagsValidation.errors.join(', ')}`);
      }

      const card = state.cards.find(c => c.id === idValidation.data);
      if (!card) return false;

      card.tags = tagsValidation.data || [];
      saveStateInternal();
      return true;
    },

    getAllTags(): string[] {
      const allTags = new Set<string>();
      state.cards.forEach(card => {
        card.tags.forEach(tag => allTags.add(tag));
      });
      return Array.from(allTags).sort();
    },

    async recordStudySession(
      sessionData: Omit<StudySessionRecord, 'id'>
    ): Promise<StudySessionRecord> {
      const newSession = sessionService.createSession(
        sessionData.sessionType as 'due' | 'custom' | 'new' | 'review'
      );
      const sessionWithQuitEarly = { ...newSession, quitEarly: false };
      state.sessionHistory.push(sessionWithQuitEarly);
      state.learningStreak = await learningStreakService.updateStreak(new Date());
      checkAndUnlockAchievements(sessionWithQuitEarly);
      if (state.sessionHistory.length > 100) {
        state.sessionHistory = state.sessionHistory.slice(-100);
      }
      saveStateInternal();
      return sessionWithQuitEarly;
    }
  };

  return service;
}

/**
 * Factory function to create a flashcard service with default dependencies
 */
export function createDefaultFlashcardService(
  dependencies: FlashcardServiceDependencies,
  loadExistingData: boolean = true
): ReturnType<typeof createFlashcardService> {
  const service = createFlashcardService(dependencies);

  if (loadExistingData && service.loadState) {
    // Load existing data asynchronously
    service.loadState().catch((error: unknown) => {
      console.error('Failed to load existing flashcard data:', error instanceof Error ? error.message : 'Unknown error');
    });
  }

  return service;
}
