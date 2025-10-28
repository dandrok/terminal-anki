/**
 * Flashcard-related types and interfaces
 */

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  tags: string[];
  easiness: number;
  interval: number;
  repetitions: number;
  nextReview: Date;
  lastReview: Date | null;
  createdAt: Date;
}

export type ReviewQuality = 0 | 1 | 2 | 3 | 4 | 5;

export type CardDifficulty = 'new' | 'learning' | 'young' | 'mature';

export interface FlashcardCreateData {
  front: string;
  back: string;
  tags?: string[];
}

export interface FlashcardUpdateData {
  front?: string;
  back?: string;
  tags?: string[];
}

export interface FlashcardSearchFilters {
  query?: string;
  tags?: string[];
  difficulty?: CardDifficulty;
  includeDue?: boolean;
}

export interface CardStatistics {
  totalCards: number;
  dueCards: number;
  newCards: number;
  learningCards: number;
  youngCards: number;
  matureCards: number;
  averageEasiness: number;
  totalReviews: number;
}

export interface TagDistribution {
  [tagName: string]: number;
}

export interface CardDistribution {
  new: number;
  learning: number;
  young: number;
  mature: number;
}

// Discriminated union for card operations
export type CardOperation =
  | { type: 'CREATE'; data: FlashcardCreateData }
  | { type: 'UPDATE'; id: string; data: FlashcardUpdateData }
  | { type: 'DELETE'; id: string }
  | { type: 'SEARCH'; filters: FlashcardSearchFilters };

// Branded types for type safety
export type CardId = string & { readonly __brand: 'CardId' };
export type TagName = string & { readonly __brand: 'TagName' };

export const createCardId = (id: string): CardId => id as CardId;
export const createTagName = (tag: string): TagName => tag as TagName;
