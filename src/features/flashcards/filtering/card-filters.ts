import { Flashcard, CustomStudyFilters, CardDifficulty, FlashcardSearchFilters } from '../domain';
import { isCardDue, getCardDifficulty } from '../sm2-algorithm/spaced-repetition';
import { Result, Ok, Err } from '../../../shared/utils/result-type.js';

/**
 * Pure functions for filtering and searching flashcards
 */

/**
 * Check if a card matches search query text
 */
export const matchesSearchQuery = (card: Flashcard, query: string): boolean => {
  const normalizedQuery = query.toLowerCase().trim();
  if (!normalizedQuery) return true;

  return (
    card.front.toLowerCase().includes(normalizedQuery) ||
    card.back.toLowerCase().includes(normalizedQuery) ||
    card.tags.some(tag => tag.toLowerCase().includes(normalizedQuery))
  );
};

/**
 * Check if a card has any of the specified tags
 */
export const matchesTags = (card: Flashcard, tags: string[]): boolean => {
  if (!tags || tags.length === 0) return true;

  const cardTags = new Set(card.tags.map(tag => tag.toLowerCase()));
  const searchTags = tags.map(tag => tag.toLowerCase());

  // Check if card has ANY of the specified tags (OR logic)
  return searchTags.some(tag => cardTags.has(tag));
};

/**
 * Check if a card matches a difficulty level
 */
export const matchesDifficulty = (card: Flashcard, difficulty: CardDifficulty): boolean => {
  return getCardDifficulty(card) === difficulty;
};

/**
 * Check if a card is due for review
 */
export const matchesDueStatus = (card: Flashcard, includeDue: boolean = true): boolean => {
  if (!includeDue) return true;
  return isCardDue(card);
};

/**
 * Apply all filters to a card
 */
export const cardMatchesFilters = (card: Flashcard, filters: FlashcardSearchFilters): boolean => {
  // Text search filter
  if (filters.query && !matchesSearchQuery(card, filters.query)) {
    return false;
  }

  // Tags filter
  if (filters.tags && !matchesTags(card, filters.tags)) {
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
 * Search cards by text query
 */
export const searchCards = (cards: Flashcard[], query: string): Flashcard[] => {
  if (!query || query.trim() === '') {
    return [...cards];
  }

  return cards.filter(card => matchesSearchQuery(card, query));
};

/**
 * Get cards that are due for review
 */
export const getDueCards = (cards: Flashcard[], referenceDate?: Date): Flashcard[] => {
  return cards.filter(card => isCardDue(card, referenceDate));
};

/**
 * Get cards by specific tags
 */
export const getCardsByTags = (cards: Flashcard[], tags: string[]): Flashcard[] => {
  if (!tags || tags.length === 0) {
    return [...cards];
  }

  return cards.filter(card => matchesTags(card, tags));
};

/**
 * Get cards by difficulty level
 */
export const getCardsByDifficulty = (
  cards: Flashcard[],
  difficulty: CardDifficulty
): Flashcard[] => {
  return cards.filter(card => matchesDifficulty(card, difficulty));
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
      filteredCards = getCardsByTags(filteredCards, filters.tags);
    }

    // Difficulty filtering
    if (filters.difficulty) {
      filteredCards = getCardsByDifficulty(filteredCards, filters.difficulty);
    }

    // Apply limit
    if (filters.limit && filters.limit > 0) {
      filteredCards = filteredCards.slice(0, filters.limit);
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
 * Fisher-Yates shuffle algorithm for randomizing card order
 */
export const shuffleArray = <T>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

/**
 * Sort cards by different criteria
 */
export const sortCards = (
  cards: Flashcard[],
  sortBy: 'created' | 'modified' | 'easiness' | 'interval' | 'nextReview',
  order: 'asc' | 'desc' = 'asc'
): Flashcard[] => {
  const sorted = [...cards].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case 'created':
        comparison = a.createdAt.getTime() - b.createdAt.getTime();
        break;
      case 'modified': {
        const aModified = a.lastReview?.getTime() || a.createdAt.getTime();
        const bModified = b.lastReview?.getTime() || b.createdAt.getTime();
        comparison = aModified - bModified;
        break;
      }
      case 'easiness':
        comparison = a.easiness - b.easiness;
        break;
      case 'interval':
        comparison = a.interval - b.interval;
        break;
      case 'nextReview':
        comparison = a.nextReview.getTime() - b.nextReview.getTime();
        break;
    }

    return order === 'desc' ? -comparison : comparison;
  });

  return sorted;
};

/**
 * Get unique tags from a collection of cards
 */
export const getUniqueTags = (cards: Flashcard[]): string[] => {
  const tagSet = new Set<string>();
  cards.forEach(card => {
    card.tags.forEach(tag => tagSet.add(tag));
  });
  return Array.from(tagSet).sort();
};

/**
 * Get tag distribution statistics
 */
export const getTagDistribution = (cards: Flashcard[]): Record<string, number> => {
  const distribution: Record<string, number> = {};

  cards.forEach(card => {
    card.tags.forEach(tag => {
      distribution[tag] = (distribution[tag] || 0) + 1;
    });
  });

  return distribution;
};

/**
 * Get cards that haven't been studied recently
 */
export const getStaleCards = (cards: Flashcard[], daysThreshold: number = 7): Flashcard[] => {
  const threshold = new Date();
  threshold.setDate(threshold.getDate() - daysThreshold);

  return cards.filter(card => {
    const lastActivity = card.lastReview || card.createdAt;
    return lastActivity < threshold;
  });
};

/**
 * Get cards that are coming up soon (within specified days)
 */
export const getUpcomingCards = (cards: Flashcard[], daysAhead: number = 3): Flashcard[] => {
  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);

  return cards.filter(card => {
    return card.nextReview >= now && card.nextReview <= futureDate;
  });
};

/**
 * Get recently studied cards (within specified hours)
 */
export const getRecentlyStudiedCards = (
  cards: Flashcard[],
  hoursBack: number = 24
): Flashcard[] => {
  const threshold = new Date();
  threshold.setHours(threshold.getHours() - hoursBack);

  return cards.filter(card => {
    return card.lastReview && card.lastReview >= threshold;
  });
};

/**
 * Advanced search with multiple criteria
 */
export const advancedSearch = (
  cards: Flashcard[],
  criteria: {
    query?: string;
    tags?: string[];
    difficulty?: CardDifficulty;
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
