import { Result, Ok, Err } from '../../../shared/utils/result-type.js';

/**
 * Pure array utility functions for card operations
 * Separated from business logic for better modularity
 */

/**
 * Fisher-Yates shuffle algorithm for randomizing array order
 * Pure function - returns new shuffled array
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
 * Shuffle array with seed for reproducible results (useful for testing)
 */
export const seededShuffleArray = <T>(array: T[], seed: number): T[] => {
  const shuffled = [...array];
  let random = seed;

  // Simple pseudo-random number generator
  const nextRandom = () => {
    random = (random * 9301 + 49297) % 233280;
    return random / 233280;
  };

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(nextRandom() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
};

/**
 * Take a random sample from an array
 */
export const randomSample = <T>(array: T[], size: number): T[] => {
  if (size >= array.length) {
    return shuffleArray(array);
  }

  const shuffled = shuffleArray(array);
  return shuffled.slice(0, size);
};

/**
 * Take first N items from array (with error handling)
 */
export const take = <T>(array: T[], count: number): Result<T[], Error> => {
  if (count < 0) {
    return Err(new Error('Count cannot be negative'));
  }

  if (count === 0) {
    return Ok([]);
  }

  return Ok(array.slice(0, Math.min(count, array.length)));
};

/**
 * Skip first N items and return the rest
 */
export const skip = <T>(array: T[], count: number): T[] => {
  if (count <= 0) {
    return [...array];
  }

  return array.slice(Math.min(count, array.length));
};

/**
 * Take items from the end of array
 */
export const takeLast = <T>(array: T[], count: number): T[] => {
  if (count <= 0) {
    return [];
  }

  const startIndex = Math.max(0, array.length - count);
  return array.slice(startIndex);
};

/**
 * Remove duplicates from array (maintains first occurrence)
 */
export const unique = <T>(array: T[]): T[] => {
  return [...new Set(array)];
};

/**
 * Remove duplicates from array based on a key function
 */
export const uniqueBy = <T, K>(array: T[], keyFn: (item: T) => K): T[] => {
  const seen = new Set<K>();
  const result: T[] = [];

  for (const item of array) {
    const key = keyFn(item);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }

  return result;
};

/**
 * Partition array into two arrays based on predicate
 */
export const partition = <T>(array: T[], predicate: (item: T) => boolean): [T[], T[]] => {
  const truthy: T[] = [];
  const falsy: T[] = [];

  for (const item of array) {
    if (predicate(item)) {
      truthy.push(item);
    } else {
      falsy.push(item);
    }
  }

  return [truthy, falsy];
};

/**
 * Group array items by a key function
 */
export const groupBy = <T, K>(array: T[], keyFn: (item: T) => K): Record<string, T[]> => {
  const groups: Record<string, T[]> = {};

  for (const item of array) {
    const key = String(keyFn(item));
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
  }

  return groups;
};

/**
 * Sort array with stable sort (maintains order of equal elements)
 */
export const stableSort = <T>(array: T[], compareFn: (a: T, b: T) => number): T[] => {
  return array
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const comparison = compareFn(a.item, b.item);
      return comparison !== 0 ? comparison : a.index - b.index;
    })
    .map(({ item }) => item);
};

/**
 * Paginate array
 */
export const paginate = <T>(
  array: T[],
  page: number,
  pageSize: number
): {
  items: T[];
  totalPages: number;
  currentPage: number;
  hasNext: boolean;
  hasPrevious: boolean;
} => {
  const totalPages = Math.ceil(array.length / pageSize);
  const currentPage = Math.max(1, Math.min(page, totalPages));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  const items = array.slice(startIndex, endIndex);

  return {
    items,
    totalPages,
    currentPage,
    hasNext: currentPage < totalPages,
    hasPrevious: currentPage > 1
  };
};

/**
 * Chunk array into smaller arrays of specified size
 */
export const chunk = <T>(array: T[], size: number): T[][] => {
  if (size <= 0) {
    throw new Error('Chunk size must be positive');
  }

  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }

  return chunks;
};

/**
 * Flatten nested array
 */
export const flatten = <T>(array: (T | T[])[]): T[] => {
  return array.reduce<T[]>((acc, item) => {
    return acc.concat(Array.isArray(item) ? flatten(item) : item);
  }, []);
};

/**
 * Check if array has any items matching predicate
 */
export const any = <T>(array: T[], predicate: (item: T) => boolean): boolean => {
  return array.some(predicate);
};

/**
 * Check if all items match predicate
 */
export const all = <T>(array: T[], predicate: (item: T) => boolean): boolean => {
  return array.every(predicate);
};

/**
 * Find first item matching predicate
 */
export const find = <T>(array: T[], predicate: (item: T) => boolean): T | undefined => {
  return array.find(predicate);
};

/**
 * Find index of first item matching predicate
 */
export const findIndex = <T>(array: T[], predicate: (item: T) => boolean): number => {
  return array.findIndex(predicate);
};
