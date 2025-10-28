/**
 * Service interfaces for dependency injection
 * Defines contracts for all application services
 */

import {
  Flashcard,
  CustomStudyFilters,
  ReviewQuality,
  StudySessionRecord,
  LearningStreak,
  Achievement,
  ExtendedStats
} from '../../features/flashcards/domain/index.js';
import { Result } from '../utils/result-type.js';

/**
 * Data repository interface for persistence operations
 */
export interface IDataRepository {
  loadData(): Promise<{
    cards: Flashcard[];
    sessionHistory: StudySessionRecord[];
    learningStreak: LearningStreak;
    achievements: Achievement[];
  }>;
  saveData(data: {
    cards: Flashcard[];
    sessionHistory: StudySessionRecord[];
    learningStreak: LearningStreak;
    achievements: Achievement[];
  }): Promise<void>;
}

/**
 * Validation service interface
 */
export interface IValidationService {
  validateFlashcard(data: unknown): {
    isValid: boolean;
    data?: Flashcard;
    errors: string[];
  };
  validateCustomStudyFilters(data: unknown): {
    isValid: boolean;
    data?: CustomStudyFilters;
    errors: string[];
  };
  validateReviewQuality(data: unknown): {
    isValid: boolean;
    data?: ReviewQuality;
    errors: string[];
  };
  validateStudySessionRecord(data: unknown): {
    isValid: boolean;
    data?: StudySessionRecord;
    errors: string[];
  };
  validateLearningStreak(data: unknown): {
    isValid: boolean;
    data?: LearningStreak;
    errors: string[];
  };
  validateAchievement(data: unknown): {
    isValid: boolean;
    data?: Achievement;
    errors: string[];
  };
  validateString(value: unknown, minLength?: number, maxLength?: number): {
    isValid: boolean;
    data?: string;
    errors: string[];
  };
  validateStringArray(value: unknown, maxLength?: number, itemLength?: number): {
    isValid: boolean;
    data?: string[];
    errors: string[];
  };
  validateNumber(value: unknown, min?: number, max?: number): {
    isValid: boolean;
    data?: number;
    errors: string[];
  };
  validateCardId(value: unknown): {
    isValid: boolean;
    data?: string;
    errors: string[];
  };
}

/**
 * Spaced repetition service interface
 */
export interface ISpacedRepetitionService {
  calculateNextReview(card: Flashcard, quality: ReviewQuality): {
    easiness: number;
    interval: number;
    repetitions: number;
    nextReview: Date;
  };
  isCardDue(card: Flashcard, referenceDate?: Date): boolean;
  getCardDifficulty(card: Flashcard): 'new' | 'learning' | 'young' | 'mature';
}

/**
 * Achievement service interface
 */
export interface IAchievementService {
  checkAchievements(
    session: StudySessionRecord,
    stats: { total: number; due: number; new: number; learning: number; young: number; mature: number }
  ): Achievement[];
  updateAchievement(id: string, achievement: Achievement): void;
  getAchievements(): Achievement[];
  getUnlockedAchievements(): Achievement[];
  getTotalAchievements(): number;
}

/**
 * Learning streak service interface
 */
export interface ILearningStreakService {
  updateStreak(date: Date): Promise<void>;
  getCurrentStreak(): Promise<number>;
  getLongestStreak(): Promise<number>;
  getLastStudyDate(): Promise<Date | null>;
  getStudyDates(): Promise<Date[]>;
  hasStreakToday(): Promise<boolean>;
}

/**
 * Session service interface
 */
export interface ISessionService {
  createSession(type: 'due' | 'custom' | 'new' | 'review'): {
    id: string;
    startTime: Date;
    sessionType: string;
    cardsStudied: number;
    correctAnswers: number;
    incorrectAnswers: number;
    averageDifficulty: number;
    duration: number;
  };
  recordCardReview(sessionId: string, cardId: string, quality: ReviewQuality): void;
  endSession(
    sessionId: string,
    results: {
      totalCards: number;
      correctAnswers: number;
      averageDifficulty: number;
    }
  ): void;
  getCurrentSession(): StudySessionRecord | null;
  getSessionHistory(): StudySessionRecord[];
  getSessionById(id: string): StudySessionRecord | null;
}

/**
 * Flashcard service interface
 */
export interface IFlashcardService {
  name: string;
  version: string;

  getAllCards(): Flashcard[];
  getDueCards(referenceDate?: Date): Flashcard[];
  getCardById(id: string): Flashcard | undefined;
  addCard(front: string, back: string, tags?: string[]): Flashcard;
  updateCard(id: string, updates: Partial<Flashcard>): Flashcard | null;
  deleteCard(id: string): boolean;
  searchCards(query: string): Flashcard[];
  getFilteredCards(filters: CustomStudyFilters): Flashcard[];
  reviewCard(id: string, quality: ReviewQuality): void;
  getCardStatistics(): {
    total: number;
    due: number;
    new: number;
    learning: number;
    young: number;
    mature: number;
  };
  getAllTags(): string[];
  getCardsByTag(tag: string): Flashcard[];
  getCardsByDifficulty(difficulty: 'new' | 'learning' | 'young' | 'mature'): Flashcard[];
  updateCardTags(cardId: string, tags: string[]): boolean;
  recordStudySession(sessionData: Omit<StudySessionRecord, 'id'>): StudySessionRecord;
  loadState?(): Promise<void>;
  saveState?(): Promise<void>;
}

/**
 * Statistics service interface
 */
export interface IStatisticsService {
  getBasicStats(): Promise<{
    totalCards: number;
    dueToday: number;
    newCards: number;
    learningCards: number;
    youngCards: number;
    matureCards: number;
  }>;
  getExtendedStats(): Promise<{
    totalReviews: number;
    averageEasiness: number;
    totalStudyTime: number;
    accuracyRate: number;
    streakDays: number;
  }>;
  getTagDistribution(): Promise<Array<{
    tag: string;
    count: number;
    percentage: number;
  }>>;
  getProgressOverTime(days: number): Promise<Array<{
    date: string;
    cardsStudied: number;
    accuracy: number;
  }>>;
}

/**
 * Filter service interface
 */
export interface IFilterService {
  filterCards(
    cards: Flashcard[],
    filters: {
      query?: string;
      tags?: string[];
      difficulty?: string;
      includeDue?: boolean;
    }
  ): Flashcard[];
  sortCards(
    cards: Flashcard[],
    sortBy: string,
    order: 'asc' | 'desc'
  ): Flashcard[];
  getUniqueTags(cards: Flashcard[]): string[];
  getTagDistribution(cards: Flashcard[]): Array<{
    tag: string;
    count: number;
  }>;
}