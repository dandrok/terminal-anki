import { Flashcard } from '../domain';

/**
 * Pure functions for text-based card searching
 * Separated from other filtering concerns for better modularity
 */

/**
 * Normalize text for case-insensitive comparison
 */
export const normalizeText = (text: string): string => {
  return text.toLowerCase().trim();
};

/**
 * Check if a card matches a search query text
 * Searches in front, back, and tags
 */
export const matchesSearchQuery = (card: Flashcard, query: string): boolean => {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return true;

  const normalizedFront = normalizeText(card.front);
  const normalizedBack = normalizeText(card.back);
  const normalizedTags = card.tags.map(normalizeText);

  return (
    normalizedFront.includes(normalizedQuery) ||
    normalizedBack.includes(normalizedQuery) ||
    normalizedTags.some(tag => tag.includes(normalizedQuery))
  );
};

/**
 * Search cards by text query with optional field filtering
 */
export const searchCardsByField = (
  cards: Flashcard[],
  query: string,
  options: {
    searchInFront?: boolean;
    searchInBack?: boolean;
    searchInTags?: boolean;
  } = {}
): Flashcard[] => {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return [...cards];

  const { searchInFront = true, searchInBack = true, searchInTags = true } = options;

  return cards.filter(card => {
    let matches = false;

    if (searchInFront) {
      matches = matches || normalizeText(card.front).includes(normalizedQuery);
    }

    if (searchInBack) {
      matches = matches || normalizeText(card.back).includes(normalizedQuery);
    }

    if (searchInTags) {
      matches = matches || card.tags.some(tag => normalizeText(tag).includes(normalizedQuery));
    }

    return matches;
  });
};

/**
 * Fuzzy search implementation (simple version)
 * Returns cards with partial matches and similarity scores
 */
export const fuzzySearchCards = (
  cards: Flashcard[],
  query: string,
  minScore: number = 0.3
): Array<{ card: Flashcard; score: number }> => {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return cards.map(card => ({ card, score: 1 }));

  const results: Array<{ card: Flashcard; score: number }> = [];

  for (const card of cards) {
    let maxScore = 0;

    // Check front text
    const frontScore = calculateSimilarity(normalizeText(card.front), normalizedQuery);
    maxScore = Math.max(maxScore, frontScore);

    // Check back text
    const backScore = calculateSimilarity(normalizeText(card.back), normalizedQuery);
    maxScore = Math.max(maxScore, backScore);

    // Check tags
    for (const tag of card.tags) {
      const tagScore = calculateSimilarity(normalizeText(tag), normalizedQuery);
      maxScore = Math.max(maxScore, tagScore);
    }

    if (maxScore >= minScore) {
      results.push({ card, score: maxScore });
    }
  }

  return results.sort((a, b) => b.score - a.score);
};

/**
 * Calculate similarity between two strings (simple implementation)
 * Uses character overlap and sequence matching
 */
export const calculateSimilarity = (str1: string, str2: string): number => {
  if (str1 === str2) return 1;
  if (str1.length === 0 || str2.length === 0) return 0;

  // Check if str2 is contained in str1
  if (str1.includes(str2) || str2.includes(str1)) {
    return Math.min(str1.length, str2.length) / Math.max(str1.length, str2.length);
  }

  // Simple character overlap score
  const chars1 = new Set(str1);
  const chars2 = new Set(str2);
  const intersection = new Set([...chars1].filter(x => chars2.has(x)));
  const union = new Set([...chars1, ...chars2]);

  return intersection.size / union.size;
};

/**
 * Extract search terms from a query string
 * Handles quoted phrases and keywords
 */
export const parseSearchQuery = (
  query: string
): {
  terms: string[];
  phrases: string[];
  excludeTerms: string[];
} => {
  const terms: string[] = [];
  const phrases: string[] = [];
  const excludeTerms: string[] = [];

  // Handle empty query
  if (!query || query.trim() === '') {
    return { terms: [], phrases: [], excludeTerms: [] };
  }

  // Simple parsing - can be enhanced with proper query parser
  const words = query.split(/\s+/).filter(word => word.length > 0);

  let i = 0;
  while (i < words.length) {
    const word = words[i];

    if (word.startsWith('"') && word.endsWith('"')) {
      // Complete quoted phrase
      phrases.push(word.slice(1, -1));
    } else if (word.startsWith('"')) {
      // Start of quoted phrase - find the end
      let phrase = word.slice(1);
      i++;
      while (i < words.length && !words[i].endsWith('"')) {
        phrase += ' ' + words[i];
        i++;
      }
      if (i < words.length && words[i].endsWith('"')) {
        phrase += ' ' + words[i].slice(0, -1);
        phrases.push(phrase);
      }
    } else if (word.startsWith('-')) {
      // Exclude term
      excludeTerms.push(word.slice(1));
    } else {
      // Regular term
      terms.push(word);
    }

    i++;
  }

  return { terms, phrases, excludeTerms };
};
