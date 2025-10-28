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
  ISessionService
} from '../../../shared/interfaces/services.js';
import { Result, Ok, Err } from '../../../shared/utils/result-type.js';
import { matchesSearchQuery, filterCards } from '../filtering';
import { getCardsByDifficulty, getDueCards } from '../filtering';
import { calculateNextReview } from '../sm2-algorithm/spaced-repetition';

/**
 * Flashcard Service Implementation with Dependency Injection
 * Refactored to use constructor injection instead of mutable state
 */
export class FlashcardService implements IFlashcardService {
  readonly name = 'FlashcardService';
  readonly version = '1.0.0';

  constructor(
    private dataRepository: IDataRepository,
    private spacedRepetitionService: ISpacedRepetitionService,
    private achievementService: IAchievementService,
    private learningStreakService: ILearningStreakService,
    private sessionService: ISessionService,
    private state: {
      cards: Flashcard[];
      sessionHistory: StudySessionRecord[];
      learningStreak: LearningStreak;
      achievements: Achievement[];
    }
  ) {
    this.state = state;
  }

  /**
   * Get all flashcards
   */
  getAllCards(): Flashcard[] {
    return [...this.state.cards];
  }

  /**
   * Get cards that are due for review
   */
  getDueCards(referenceDate: Date = new Date()): Flashcard[] {
    return this.state.cards.filter(card =>
      this.spacedRepetitionService.isCardDue(card, referenceDate)
    );
  }

  /**
   * Get a specific card by ID
   */
  getCardById(id: string): Flashcard | undefined {
    return this.state.cards.find(card => card.id === id);
  }

  /**
   * Add a new flashcard
   */
  addCard(front: string, back: string, tags: string[] = []): Flashcard {
    const newCard: Flashcard = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      front: front.trim(),
      back: back.trim(),
      tags: tags.map(tag => tag.trim().toLowerCase()),
      easiness: 2.5,
      interval: 1,
      repetitions: 0,
      nextReview: new Date(),
      lastReview: null,
      createdAt: new Date()
    };

    this.state.cards.push(newCard);
    this.saveState();

    return newCard;
  }

  /**
   * Update an existing flashcard
   */
  updateCard(id: string, updates: Partial<Flashcard>): Flashcard | null {
    const cardIndex = this.state.cards.findIndex(card => card.id === id);
    if (cardIndex === -1) {
      return null;
    }

    const updatedCard = { ...this.state.cards[cardIndex], ...updates };
    this.state.cards[cardIndex] = updatedCard;
    this.saveState();

    return updatedCard;
  }

  /**
   * Delete a flashcard
   */
  deleteCard(id: string): boolean {
    const initialLength = this.state.cards.length;
    this.state.cards = this.state.cards.filter(card => card.id !== id);
    const wasDeleted = this.state.cards.length < initialLength;

    if (wasDeleted) {
      this.saveState();
    }

    return wasDeleted;
  }

  /**
   * Search cards by query
   */
  searchCards(query: string): Flashcard[] {
    return this.state.cards.filter(card => matchesSearchQuery(card, query));
  }

  /**
   * Get filtered cards based on criteria
   */
  getFilteredCards(filters: CustomStudyFilters): Flashcard[] {
    const filtered = filterCards(this.state.cards, {
      query: filters.query,
      tags: filters.tags,
      difficulty: filters.difficulty,
      includeDue: filters.includeDue
    });

    // Apply limit
    let result = filtered;
    if (filters.limit && filters.limit > 0) {
      result = result.slice(0, filters.limit);
    }

    // Apply random order if requested
    if (filters.randomOrder) {
      result = this.shuffleArray(result);
    }

    return result;
  }

  /**
   * Review a card and update its progress
   */
  reviewCard(id: string, quality: ReviewQuality): void {
    const cardIndex = this.state.cards.findIndex(card => card.id === id);
    if (cardIndex === -1) {
      throw new Error(`Card with ID '${id}' not found`);
    }

    const card = this.state.cards[cardIndex];
    const reviewResult = this.spacedRepetitionService.calculateNextReview(card, quality);

    // Update the card with new values
    this.state.cards[cardIndex] = {
      ...card,
      ...reviewResult,
      lastReview: new Date()
    };

    this.saveState();

    // Record the review in the current session if one exists
    const currentSession = this.sessionService.getCurrentSession();
    if (currentSession) {
      this.sessionService.recordCardReview(currentSession.id, id, quality);
    }

    // Check for achievements
    this.checkAchievements();

    // Update learning streak
    this.learningStreakService.updateStreak(new Date());
  }

  /**
   * Record a study session
   */
  async recordStudySession(
    sessionData: Omit<StudySessionRecord, 'id'>
  ): Promise<StudySessionRecord> {
    const session = this.sessionService.createSession(
      sessionData.sessionType as any
    );

    const completeSession: StudySessionRecord = {
      ...sessionData,
      id: session.id,
      startTime: session.startTime,
      endTime: new Date(),
      duration: (sessionData.endTime || new Date()).getTime() - session.startTime.getTime(),
    };

    this.state.sessionHistory.push(completeSession);

    // Keep only last 100 sessions
    if (this.state.sessionHistory.length > 100) {
      this.state.sessionHistory = this.state.sessionHistory.slice(-100);
    }

    this.saveState();
    this.checkAchievements();

    return completeSession;
  }

  /**
   * Update card tags
   */
  updateCardTags(cardId: string, tags: string[]): boolean {
    const card = this.state.cards.find(c => c.id === cardId);
    if (!card) return false;

    card.tags = tags;
    this.saveState();
    return true;
  }

  /**
   * Get cards by difficulty
   */
  getCardsByDifficulty(difficulty: 'new' | 'learning' | 'young' | 'mature'): Flashcard[] {
    return this.state.cards.filter(card => {
      const cardDifficulty = this.spacedRepetitionService.getCardDifficulty(card);
      return cardDifficulty === difficulty;
    });
  }

  /**
   * Get cards by tag
   */
  getCardsByTag(tag: string): Flashcard[] {
    return this.state.cards.filter(card => card.tags.includes(tag.toLowerCase()));
  }

  /**
   * Get all unique tags from flashcards
   */
  getAllTags(): string[] {
    const allTags = new Set<string>();
    this.state.cards.forEach(card => {
      card.tags.forEach(tag => allTags.add(tag));
    });
    return Array.from(allTags).sort();
  }

  /**
   * Get card statistics
   */
  getCardStatistics(): {
    total: number;
    due: number;
    new: number;
    learning: number;
    young: number;
    mature: number;
  } {
    const stats = {
      total: this.state.cards.length,
      due: this.getDueCards().length,
      new: 0,
      learning: 0,
      young: 0,
      mature: 0
    };

    for (const card of this.state.cards) {
      const difficulty = this.spacedRepetitionService.getCardDifficulty(card);
      stats[difficulty]++;
    }

    return stats;
  }

  /**
   * Load state from data repository
   */
  async loadState(): Promise<void> {
    try {
      const data = await this.dataRepository.loadData();
      this.state = {
        cards: data.cards,
        sessionHistory: data.sessionHistory,
        learningStreak: data.learningStreak,
        achievements: data.achievements
      };
    } catch (error) {
      console.error('Failed to load state:', error);
      throw error;
    }
  }

  /**
   * Save state to data repository
   */
  async saveState(): Promise<void> {
    try {
      await this.dataRepository.saveData({
        cards: this.state.cards,
        sessionHistory: this.state.sessionHistory,
        learningStreak: this.state.learningStreak,
        achievements: this.state.achievements
      });
    } catch (error) {
      console.error('Failed to save state:', error);
      throw error;
    }
  }

  /**
   * Check for achievements based on current progress
   */
  private checkAchievements(): void {
    try {
      const sessionData = this.sessionService.getCurrentSession();
      const stats = this.getCardStatistics();

      if (sessionData) {
        const newAchievements = this.achievementService.checkAchievements(sessionData, stats);
        for (const achievement of newAchievements) {
          this.achievementService.updateAchievement(achievement.id, achievement);
        }
      }
    } catch (error) {
      console.error('Failed to check achievements:', error);
    }
  }

  /**
   * Fisher-Yates shuffle algorithm
   */
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Reset state (mainly for testing)
   */
  resetState(newState?: {
    cards: Flashcard[];
    sessionHistory: StudySessionRecord[];
    learningStreak: LearningStreak;
    achievements: Achievement[];
  }): void {
    this.state = newState || {
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
  }
}
