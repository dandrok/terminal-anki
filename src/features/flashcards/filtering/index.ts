/**
 * Barrel exports for refactored card filtering modules
 * Replaces the monolithic card-filters.ts with focused, modular functions
 */

// Text search functionality
export * from './text-search.js';

// Tag-based filtering
export * from './tag-filters.js';

// Difficulty-based filtering
export * from './difficulty-filters.js';

// Date-based filtering
export * from './date-filters.js';

// Array operations and utilities
export * from './array-operations.js';

// Card sorting algorithms
export * from './card-sorting.js';

// Filter composition and orchestration
export * from './filter-composition.js';

// Legacy exports for backward compatibility
export {
  matchesSearchQuery,
  filterCards,
  searchCards,
  applyCustomStudyFilters,
  shuffleArray,
  sortCards,
  getUniqueTags,
  getTagDistribution,
  getStaleCards,
  getUpcomingCards,
  getRecentlyStudiedCards,
  advancedSearch
} from './filter-composition.js';
