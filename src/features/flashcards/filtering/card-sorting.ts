import { Flashcard } from '../domain';

/**
 * Pure functions for sorting cards by various criteria
 * Separated from filtering concerns for better modularity
 */

/**
 * Sort cards by different criteria
 */
export const sortCards = (
  cards: Flashcard[],
  sortBy: 'created' | 'modified' | 'easiness' | 'interval' | 'nextReview' | 'repetitions',
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
      case 'repetitions':
        comparison = a.repetitions - b.repetitions;
        break;
    }

    return order === 'desc' ? -comparison : comparison;
  });

  return sorted;
};

/**
 * Multi-criteria sorting (primary then secondary criteria)
 */
export const sortCardsByMultiple = (
  cards: Flashcard[],
  criteria: Array<{
    field: 'created' | 'modified' | 'easiness' | 'interval' | 'nextReview' | 'repetitions';
    order: 'asc' | 'desc';
  }>
): Flashcard[] => {
  return [...cards].sort((a, b) => {
    for (const { field, order } of criteria) {
      let comparison = 0;

      switch (field) {
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
        case 'repetitions':
          comparison = a.repetitions - b.repetitions;
          break;
      }

      if (comparison !== 0) {
        return order === 'desc' ? -comparison : comparison;
      }
    }

    return 0;
  });
};

/**
 * Sort cards by text content (front or back)
 */
export const sortCardsByText = (
  cards: Flashcard[],
  field: 'front' | 'back',
  order: 'asc' | 'desc' = 'asc'
): Flashcard[] => {
  return [...cards].sort((a, b) => {
    const aValue = a[field].toLowerCase();
    const bValue = b[field].toLowerCase();
    const comparison = aValue.localeCompare(bValue);
    return order === 'desc' ? -comparison : comparison;
  });
};

/**
 * Sort cards by tag count
 */
export const sortCardsByTagCount = (
  cards: Flashcard[],
  order: 'asc' | 'desc' = 'asc'
): Flashcard[] => {
  return [...cards].sort((a, b) => {
    const comparison = a.tags.length - b.tags.length;
    return order === 'desc' ? -comparison : comparison;
  });
};

/**
 * Sort cards by custom comparator function
 */
export const sortCardsByCustom = (
  cards: Flashcard[],
  compareFn: (a: Flashcard, b: Flashcard) => number
): Flashcard[] => {
  return [...cards].sort(compareFn);
};

/**
 * Stable sort (maintains order of equal elements)
 */
export const stableSortCards = (
  cards: Flashcard[],
  sortBy: 'created' | 'modified' | 'easiness' | 'interval' | 'nextReview' | 'repetitions',
  order: 'asc' | 'desc' = 'asc'
): Flashcard[] => {
  return cards
    .map((card, index) => ({ card, index }))
    .sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'created':
          comparison = a.card.createdAt.getTime() - b.card.createdAt.getTime();
          break;
        case 'modified': {
          const aModified = a.card.lastReview?.getTime() || a.card.createdAt.getTime();
          const bModified = b.card.lastReview?.getTime() || b.card.createdAt.getTime();
          comparison = aModified - bModified;
          break;
        }
        case 'easiness':
          comparison = a.card.easiness - b.card.easiness;
          break;
        case 'interval':
          comparison = a.card.interval - b.card.interval;
          break;
        case 'nextReview':
          comparison = a.card.nextReview.getTime() - b.card.nextReview.getTime();
          break;
        case 'repetitions':
          comparison = a.card.repetitions - b.card.repetitions;
          break;
      }

      if (comparison !== 0) {
        return order === 'desc' ? -comparison : comparison;
      }

      return a.index - b.index;
    })
    .map(({ card }) => card);
};

/**
 * Sort cards with priority (some cards always come first)
 */
export const sortCardsByPriority = (
  cards: Flashcard[],
  priorityFn: (card: Flashcard) => number,
  thenBy?: 'created' | 'modified' | 'easiness' | 'interval' | 'nextReview' | 'repetitions',
  thenOrder: 'asc' | 'desc' = 'asc'
): Flashcard[] => {
  return [...cards].sort((a, b) => {
    const aPriority = priorityFn(a);
    const bPriority = priorityFn(b);

    if (aPriority !== bPriority) {
      return bPriority - aPriority; // Higher priority first
    }

    if (thenBy) {
      const thenSortResult = sortCardsByMultiple([a, b], [{ field: thenBy, order: thenOrder }]);
      return thenSortResult.indexOf(a) - thenSortResult.indexOf(b);
    }

    return 0;
  });
};

/**
 * Create a sorting configuration object
 */
export type SortConfig = {
  field: 'created' | 'modified' | 'easiness' | 'interval' | 'nextReview' | 'repetitions';
  order: 'asc' | 'desc';
};

/**
 * Apply sorting configuration to cards
 */
export const applySortingConfig = (
  cards: Flashcard[],
  config: SortConfig | SortConfig[]
): Flashcard[] => {
  if (Array.isArray(config)) {
    return sortCardsByMultiple(cards, config);
  } else {
    return sortCards(cards, config.field, config.order);
  }
};

/**
 * Get sort field display name
 */
export const getSortFieldDisplayName = (
  field: 'created' | 'modified' | 'easiness' | 'interval' | 'nextReview' | 'repetitions'
): string => {
  const displayNames = {
    created: 'Created Date',
    modified: 'Last Modified',
    easiness: 'Easiness',
    interval: 'Interval',
    nextReview: 'Next Review',
    repetitions: 'Repetitions'
  };

  return displayNames[field];
};

/**
 * Create default sort configurations
 */
export const DEFAULT_SORT_CONFIGS: Record<string, SortConfig> = {
  newestFirst: { field: 'created', order: 'desc' },
  oldestFirst: { field: 'created', order: 'asc' },
  recentlyModified: { field: 'modified', order: 'desc' },
  easiestFirst: { field: 'easiness', order: 'desc' },
  hardestFirst: { field: 'easiness', order: 'asc' },
  longestInterval: { field: 'interval', order: 'desc' },
  shortestInterval: { field: 'interval', order: 'asc' },
  dueSoonest: { field: 'nextReview', order: 'asc' },
  dueLatest: { field: 'nextReview', order: 'desc' },
  mostReviewed: { field: 'repetitions', order: 'desc' },
  leastReviewed: { field: 'repetitions', order: 'asc' }
};
