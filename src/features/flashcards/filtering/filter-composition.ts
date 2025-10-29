import { Flashcard, FlashcardSearchFilters, CustomStudyFilters } from '../domain';
import { Result, Ok, Err } from '../../../shared/utils/result-type.js';
import { matchesSearchQuery } from './text-search.js';
import { matchesTags } from './tag-filters.js';
import { matchesDifficulty } from './difficulty-filters.js';
import { matchesDueStatus } from './date-filters.js';
import { take, shuffleArray } from './array-operations.js';

/**
 * Pure functions for composing multiple filters
 * High-level filter orchestration layer
 */

/**
 * Apply all filters to a card (original logic preserved)
 */
export const cardMatchesFilters = (card: Flashcard, filters: FlashcardSearchFilters): boolean => {
  // Text search filter
  if (filters.query && !matchesSearchQuery(card, filters.query)) {
    return false;
  }

  // Tags filter
  if (filters.tags && filters.tags.length > 0 && !matchesTags(card, filters.tags)) {
    return false;
  }

  // Difficulty filter
  if (filters.difficulty && !matchesDifficulty(card, filters.difficulty)) {
    return false;
  }

  // Due status filter
  if (filters.includeDue !== undefined && !matchesDueStatus(card, filters.includeDue)) {
    return false;
  }

  return true;
};

/**
 * Filter an array of cards based on search criteria
 */
export const filterCards = (cards: Flashcard[], filters: FlashcardSearchFilters): Flashcard[] => {
  return cards.filter(card => cardMatchesFilters(card, filters));
};

/**
 * Apply custom study session filters
 */
export const applyCustomStudyFilters = (
  cards: Flashcard[],
  filters: CustomStudyFilters
): Result<Flashcard[]> => {
  try {
    let filteredCards = [...cards];

    // Tag filtering
    if (filters.tags && filters.tags.length > 0) {
      filteredCards = filteredCards.filter(card => matchesTags(card, filters.tags!));
    }

    // Difficulty filtering
    if (filters.difficulty) {
      filteredCards = filteredCards.filter(card => matchesDifficulty(card, filters.difficulty!));
    }

    // Apply limit
    if (filters.limit && filters.limit > 0) {
      const takeResult = take(filteredCards, filters.limit);
      if (!takeResult.success) {
        return takeResult;
      }
      filteredCards = takeResult.data;
    }

    // Random order if requested
    if (filters.randomOrder) {
      filteredCards = shuffleArray(filteredCards);
    }

    return Ok(filteredCards);
  } catch (error) {
    return Err(error instanceof Error ? error : new Error('Failed to apply filters'));
  }
};

/**
 * Advanced search with multiple criteria
 */
export const advancedSearch = (
  cards: Flashcard[],
  criteria: {
    query?: string;
    tags?: string[];
    difficulty?: any; // CardDifficulty
    includeDue?: boolean;
    createdAfter?: Date;
    createdBefore?: Date;
    lastReviewAfter?: Date;
    lastReviewBefore?: Date;
    minEasiness?: number;
    maxEasiness?: number;
    minInterval?: number;
    maxInterval?: number;
  }
): Flashcard[] => {
  return cards.filter(card => {
    // Text search
    if (criteria.query && !matchesSearchQuery(card, criteria.query)) {
      return false;
    }

    // Tags
    if (criteria.tags && !matchesTags(card, criteria.tags)) {
      return false;
    }

    // Difficulty
    if (criteria.difficulty && !matchesDifficulty(card, criteria.difficulty)) {
      return false;
    }

    // Due status
    if (criteria.includeDue !== undefined && !matchesDueStatus(card, criteria.includeDue)) {
      return false;
    }

    // Creation date range
    if (criteria.createdAfter && card.createdAt < criteria.createdAfter) {
      return false;
    }
    if (criteria.createdBefore && card.createdAt > criteria.createdBefore) {
      return false;
    }

    // Last review date range
    if (
      criteria.lastReviewAfter &&
      (!card.lastReview || card.lastReview < criteria.lastReviewAfter)
    ) {
      return false;
    }
    if (
      criteria.lastReviewBefore &&
      card.lastReview &&
      card.lastReview > criteria.lastReviewBefore
    ) {
      return false;
    }

    // Easiness range
    if (criteria.minEasiness && card.easiness < criteria.minEasiness) {
      return false;
    }
    if (criteria.maxEasiness && card.easiness > criteria.maxEasiness) {
      return false;
    }

    // Interval range
    if (criteria.minInterval && card.interval < criteria.minInterval) {
      return false;
    }
    if (criteria.maxInterval && card.interval > criteria.maxInterval) {
      return false;
    }

    return true;
  });
};

/**
 * Compose multiple filter functions
 */
export const composeFilters = <T>(...filters: Array<(item: T) => boolean>) => {
  return (item: T): boolean => {
    return filters.every(filter => filter(item));
  };
};

/**
 * Compose filters with OR logic
 */
export const composeFiltersOR = <T>(...filters: Array<(item: T) => boolean>) => {
  return (item: T): boolean => {
    return filters.some(filter => filter(item));
  };
};

/**
 * Create a filter function from criteria
 */
export const createFilter = (criteria: Partial<FlashcardSearchFilters>) => {
  return (card: Flashcard): boolean => cardMatchesFilters(card, criteria);
};

/**
 * Chain multiple filtering operations
 */
export const filterChain = <T>(items: T[], ...filters: Array<(items: T[]) => T[]>): T[] => {
  return filters.reduce((currentItems, filter) => filter(currentItems), items);
};

/**
 * Combine multiple filter results with intersection
 */
export const intersectFilterResults = <T>(...results: T[][]): T[] => {
  if (results.length === 0) return [];
  if (results.length === 1) return results[0];

  const [first, ...rest] = results;
  const intersection = new Set(first);

  for (const result of rest) {
    for (const item of intersection) {
      if (!result.includes(item)) {
        intersection.delete(item);
      }
    }
  }

  return Array.from(intersection);
};

/**
 * Combine multiple filter results with union
 */
export const unionFilterResults = <T>(...results: T[][]): T[] => {
  const union = new Set<T>();

  for (const result of results) {
    for (const item of result) {
      union.add(item);
    }
  }

  return Array.from(union);
};

/**
 * Create a filter pipeline for complex filtering scenarios
 */
export class FilterPipeline<T> {
  private filters: Array<(items: T[]) => T[]> = [];

  addFilter(filter: (items: T[]) => T[]): FilterPipeline<T> {
    this.filters.push(filter);
    return this;
  }

  addPredicateFilter(predicate: (item: T) => boolean): FilterPipeline<T> {
    this.filters.push(items => items.filter(predicate));
    return this;
  }

  execute(items: T[]): T[] {
    return this.filters.reduce((currentItems, filter) => filter(currentItems), items);
  }

  reset(): FilterPipeline<T> {
    this.filters = [];
    return this;
  }
}

/**
 * Create a filter pipeline for cards
 */
export const createCardFilterPipeline = (): FilterPipeline<Flashcard> => {
  return new FilterPipeline<Flashcard>();
};

// Legacy compatibility exports - these were referenced in the old card-filters.ts
export { sortCards } from './card-sorting.js';
export { getUniqueTags, getTagDistribution } from './tag-filters.js';
export { shuffleArray } from './array-operations.js';
export { matchesSearchQuery } from './text-search.js';

// Additional legacy functions for compatibility
export const searchCards = (cards: Flashcard[], query: string): Flashcard[] => {
  return cards.filter(card => matchesSearchQuery(card, query));
};

export const getStaleCards = (cards: Flashcard[], days: number = 30): Flashcard[] => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  return cards.filter(card => !card.lastReview || card.lastReview < cutoffDate);
};

export const getUpcomingCards = (cards: Flashcard[], days: number = 7): Flashcard[] => {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  return cards.filter(card => card.nextReview <= futureDate && card.nextReview > new Date());
};

export const getRecentlyStudiedCards = (cards: Flashcard[], days: number = 7): Flashcard[] => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  return cards.filter(card => card.lastReview && card.lastReview >= cutoffDate);
};
