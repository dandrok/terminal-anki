import { Flashcard } from '../domain';

/**
 * Pure functions for tag-based card filtering and analysis
 * Separated from other filtering concerns for better modularity
 */

/**
 * Check if a card has any of the specified tags (OR logic)
 */
export const matchesTags = (card: Flashcard, tags: string[]): boolean => {
  if (!tags || tags.length === 0) return true;

  const cardTags = new Set(card.tags.map(tag => tag.toLowerCase()));
  const searchTags = tags.map(tag => tag.toLowerCase());

  return searchTags.some(tag => cardTags.has(tag));
};

/**
 * Check if a card has ALL of the specified tags (AND logic)
 */
export const matchesAllTags = (card: Flashcard, tags: string[]): boolean => {
  if (!tags || tags.length === 0) return true;

  const cardTags = new Set(card.tags.map(tag => tag.toLowerCase()));
  const searchTags = tags.map(tag => tag.toLowerCase());

  return searchTags.every(tag => cardTags.has(tag));
};

/**
 * Check if a card has none of the specified tags (NOT logic)
 */
export const excludesTags = (card: Flashcard, tags: string[]): boolean => {
  if (!tags || tags.length === 0) return true;

  const cardTags = new Set(card.tags.map(tag => tag.toLowerCase()));
  const excludeTags = tags.map(tag => tag.toLowerCase());

  return !excludeTags.some(tag => cardTags.has(tag));
};

/**
 * Get cards that have any of the specified tags
 */
export const getCardsByTags = (
  cards: Flashcard[],
  tags: string[],
  matchType: 'any' | 'all' | 'none' = 'any'
): Flashcard[] => {
  if (!tags || tags.length === 0) {
    return [...cards];
  }

  const tagFilter =
    matchType === 'any' ? matchesTags : matchType === 'all' ? matchesAllTags : excludesTags;

  return cards.filter(card => tagFilter(card, tags));
};

/**
 * Get unique tags from a collection of cards
 */
export const getUniqueTags = (cards: Flashcard[]): string[] => {
  const tagSet = new Set<string>();
  cards.forEach(card => {
    card.tags.forEach(tag => tagSet.add(tag.toLowerCase()));
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
      const normalizedTag = tag.toLowerCase();
      distribution[normalizedTag] = (distribution[normalizedTag] || 0) + 1;
    });
  });

  return distribution;
};

/**
 * Get most popular tags
 */
export const getPopularTags = (
  cards: Flashcard[],
  limit: number = 10
): Array<{ tag: string; count: number; percentage: number }> => {
  const distribution = getTagDistribution(cards);
  const totalCards = cards.length;

  return Object.entries(distribution)
    .map(([tag, count]) => ({
      tag,
      count,
      percentage: (count / totalCards) * 100
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
};

/**
 * Get cards without any tags
 */
export const getUntaggedCards = (cards: Flashcard[]): Flashcard[] => {
  return cards.filter(card => !card.tags || card.tags.length === 0);
};

/**
 * Group cards by tags
 */
export const groupCardsByTags = (cards: Flashcard[]): Record<string, Flashcard[]> => {
  const grouped: Record<string, Flashcard[]> = {};

  cards.forEach(card => {
    card.tags.forEach(tag => {
      const normalizedTag = tag.toLowerCase();
      if (!grouped[normalizedTag]) {
        grouped[normalizedTag] = [];
      }
      grouped[normalizedTag].push(card);
    });
  });

  return grouped;
};

/**
 * Get tag overlap between two sets of cards
 */
export const getTagOverlap = (
  cards1: Flashcard[],
  cards2: Flashcard[]
): {
  commonTags: string[];
  uniqueToFirst: string[];
  uniqueToSecond: string[];
  overlapScore: number;
} => {
  const tags1 = new Set(getUniqueTags(cards1));
  const tags2 = new Set(getUniqueTags(cards2));

  const commonTags = [...tags1].filter(tag => tags2.has(tag));
  const uniqueToFirst = [...tags1].filter(tag => !tags2.has(tag));
  const uniqueToSecond = [...tags2].filter(tag => !tags1.has(tag));

  const totalUniqueTags = tags1.size + tags2.size - commonTags.length;
  const overlapScore = totalUniqueTags > 0 ? commonTags.length / totalUniqueTags : 0;

  return {
    commonTags,
    uniqueToFirst,
    uniqueToSecond,
    overlapScore
  };
};

/**
 * Validate tag name
 */
export const isValidTagName = (tag: string): boolean => {
  const trimmed = tag.trim();
  return trimmed.length > 0 && trimmed.length <= 50 && !trimmed.includes(',');
};

/**
 * Normalize and validate tag names
 */
export const normalizeTag = (tag: string): string => {
  return tag.trim().toLowerCase();
};

/**
 * Clean up and deduplicate tag array
 */
export const cleanTagArray = (tags: string[]): string[] => {
  const cleaned = tags.map(normalizeTag).filter(isValidTagName);

  return [...new Set(cleaned)]; // Remove duplicates
};
