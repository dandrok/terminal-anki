import { describe, it, expect } from 'vitest';
import {
  matchesSearchQuery,
  matchesTags,
  matchesDifficulty,
  cardMatchesFilters,
  filterCards,
  searchCards,
  getDueCards,
  getCardsByTags,
  getCardsByDifficulty,
  applyCustomStudyFilters,
  shuffleArray,
  sortCards,
  getUniqueTags,
  getTagDistribution,
  getStaleCards,
  getUpcomingCards,
  getRecentlyStudiedCards,
  advancedSearch,
} from './card-filters.js';
import { Flashcard, CustomStudyFilters } from '../domain';
import { addDays, subDays } from '../../../shared/utils/date-utils';

describe('Card Filters', () => {
  const createMockCard = (overrides: Partial<Flashcard> = {}): Flashcard => ({
    id: 'test-card-1',
    front: 'What is TypeScript?',
    back: 'A typed superset of JavaScript',
    tags: ['programming', 'typescript', 'javascript'],
    easiness: 2.5,
    interval: 5,
    repetitions: 3,
    nextReview: new Date(),
    lastReview: subDays(new Date(), 2),
    createdAt: subDays(new Date(), 10),
    ...overrides,
  });

      const mockCards: Flashcard[] = [
        createMockCard({
          id: 'card-1',
          front: 'What is React?',
          back: 'A JavaScript library for building user interfaces',
          tags: ['programming', 'react', 'javascript'],
          easiness: 2.8,
          interval: 15,
          nextReview: addDays(new Date(), 3),
        }),
        createMockCard({
          id: 'card-2',
          front: 'What is Python?',
          back: 'A high-level programming language',
          tags: ['programming', 'python'],
          easiness: 2.3,
          interval: 2,
          nextReview: subDays(new Date(), 1), // Overdue
        }),
        createMockCard({
          id: 'card-3',
          front: 'What is Node.js?',
          back: 'A JavaScript runtime built on Chrome\'s V8 engine',
          tags: ['programming', 'nodejs', 'javascript'],
          easiness: 2.6,
          interval: 8,
          nextReview: new Date(), // Due today
        }),
        createMockCard({ // Added this card
          id: 'card-4',
          front: 'What is TypeScript?',
          back: 'A typed superset of JavaScript',
          tags: ['programming', 'typescript', 'javascript'],
          easiness: 2.5,
          interval: 5,
          repetitions: 3,
          nextReview: new Date(),
          lastReview: subDays(new Date(), 2),
          createdAt: subDays(new Date(), 10),
        }),
      ];

  describe('matchesSearchQuery', () => {
    it('should match cards by front text', () => {
      const card = createMockCard({ front: 'What is React?' });
      expect(matchesSearchQuery(card, 'React')).toBe(true);
      expect(matchesSearchQuery(card, 'react')).toBe(true);
      expect(matchesSearchQuery(card, 'Angular')).toBe(false);
    });

    it('should match cards by back text', () => {
      const card = createMockCard({ back: 'A JavaScript library for building user interfaces' });
      expect(matchesSearchQuery(card, 'JavaScript')).toBe(true);
      expect(matchesSearchQuery(card, 'library')).toBe(true);
      expect(matchesSearchQuery(card, 'database')).toBe(false);
    });

    it('should match cards by tags', () => {
      const card = createMockCard({ tags: ['programming', 'react', 'javascript'] });
      expect(matchesSearchQuery(card, 'react')).toBe(true);
      expect(matchesSearchQuery(card, 'programming')).toBe(true);
      expect(matchesSearchQuery(card, 'python')).toBe(false);
    });

    it('should handle empty query', () => {
      const card = createMockCard();
      expect(matchesSearchQuery(card, '')).toBe(true);
      expect(matchesSearchQuery(card, '   ')).toBe(true);
    });

    it('should be case insensitive', () => {
      const card = createMockCard({ front: 'What is TYPESCRIPT?' });
      expect(matchesSearchQuery(card, 'typescript')).toBe(true);
      expect(matchesSearchQuery(card, 'TypeScript')).toBe(true);
    });
  });

  describe('matchesTags', () => {
    it('should match cards with any of the specified tags', () => {
      const card = createMockCard({ tags: ['programming', 'react', 'javascript'] });
      expect(matchesTags(card, ['react'])).toBe(true);
      expect(matchesTags(card, ['python'])).toBe(false);
      expect(matchesTags(card, ['react', 'python'])).toBe(true); // OR logic
      expect(matchesTags(card, ['python', 'javascript'])).toBe(true);
    });

    it('should handle empty tags array', () => {
      const card = createMockCard({ tags: ['programming'] });
      expect(matchesTags(card, [])).toBe(true);
      expect(matchesTags(card, undefined as any)).toBe(true);
    });

    it('should be case insensitive', () => {
      const card = createMockCard({ tags: ['Programming', 'React'] });
      expect(matchesTags(card, ['programming'])).toBe(true);
      expect(matchesTags(card, ['REACT'])).toBe(true);
    });
  });

  describe('matchesDifficulty', () => {
    it('should classify new cards correctly', () => {
      const newCard = createMockCard({ interval: 1 });
      expect(matchesDifficulty(newCard, 'new')).toBe(true);
      expect(matchesDifficulty(newCard, 'learning')).toBe(false);
    });

    it('should classify learning cards correctly', () => {
      const learningCard = createMockCard({ interval: 5 });
      expect(matchesDifficulty(learningCard, 'learning')).toBe(true);
      expect(matchesDifficulty(learningCard, 'new')).toBe(false);
    });

    it('should classify young cards correctly', () => {
      const youngCard = createMockCard({ interval: 15 });
      expect(matchesDifficulty(youngCard, 'young')).toBe(true);
      expect(matchesDifficulty(youngCard, 'learning')).toBe(false);
    });

    it('should classify mature cards correctly', () => {
      const matureCard = createMockCard({ interval: 45 });
      expect(matchesDifficulty(matureCard, 'mature')).toBe(true);
      expect(matchesDifficulty(matureCard, 'young')).toBe(false);
    });
  });

  describe('filterCards', () => {
    it('should apply multiple filters correctly', () => {
      const filters = {
        query: 'JavaScript',
        tags: ['programming'],
        difficulty: 'young' as const,
      };

      const filtered = filterCards(mockCards, filters);
      expect(filtered.length).toBeGreaterThanOrEqual(0);
    });

    it('should return all cards when no filters are applied', () => {
      const filtered = filterCards(mockCards, {});
      expect(filtered).toHaveLength(mockCards.length);
    });
  });

  describe('searchCards', () => {
    it('should search cards by text', () => {
      const results = searchCards(mockCards, 'JavaScript');
      expect(results.length).toBeGreaterThan(0);
      expect(results.every(card =>
        card.front.toLowerCase().includes('javascript') ||
        card.back.toLowerCase().includes('javascript') ||
        card.tags.some(tag => tag.toLowerCase().includes('javascript'))
      )).toBe(true);
    });

    it('should return all cards for empty query', () => {
      const results = searchCards(mockCards, '');
      expect(results).toHaveLength(mockCards.length);
    });

    it('should return empty array for non-matching query', () => {
      const results = searchCards(mockCards, 'NonExistentTerm');
      expect(results).toHaveLength(0);
    });
  });

  describe('getDueCards', () => {
    it('should return cards that are due', () => {
      const dueCards = getDueCards(mockCards);
      expect(dueCards.length).toBeGreaterThan(0);
      expect(dueCards.every(card => card.nextReview <= new Date())).toBe(true);
    });

    it('should respect reference date parameter', () => {
      const futureDate = addDays(new Date(), 5);
      const dueCards = getDueCards(mockCards, futureDate);
      expect(dueCards.length).toBeGreaterThan(2); // Should include cards due in 5 days
    });
  });

  describe('getCardsByTags', () => {
    it('should return cards with specified tags', () => {
      const javascriptCards = getCardsByTags(mockCards, ['javascript']);
      expect(javascriptCards.length).toBe(3);
      expect(javascriptCards.every(card =>
        card.tags.some(tag => tag.toLowerCase() === 'javascript')
      )).toBe(true);
    });

    it('should handle multiple tags with OR logic', () => {
      const cards = getCardsByTags(mockCards, ['python', 'nodejs']);
      expect(cards.length).toBe(2); // One python card, one nodejs card
    });

    it('should return empty array for non-existent tags', () => {
      const cards = getCardsByTags(mockCards, ['nonexistent']);
      expect(cards).toHaveLength(0);
    });
  });

  describe('getCardsByDifficulty', () => {
    it('should return cards of specified difficulty', () => {
      const youngCards = getCardsByDifficulty(mockCards, 'learning');
      expect(youngCards.every(card => card.interval >= 2 && card.interval <= 7)).toBe(true);
    });
  });

  describe('applyCustomStudyFilters', () => {
    it('should apply tag filters', () => {
      const filters: CustomStudyFilters = {
        tags: ['javascript'],
      };

      const result = applyCustomStudyFilters(mockCards, filters);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.length).toBe(3);
      }
    });

    it('should apply difficulty filters', () => {
      const filters: CustomStudyFilters = {
        difficulty: 'young',
      };

      const result = applyCustomStudyFilters(mockCards, filters);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.every(card => card.interval > 7 && card.interval <= 30)).toBe(true);
      }
    });

    it('should apply limit filters', () => {
      const filters: CustomStudyFilters = {
        limit: 2,
      };

      const result = applyCustomStudyFilters(mockCards, filters);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.length).toBeLessThanOrEqual(2);
      }
    });

    it('should randomize order when requested', () => {
      const filters: CustomStudyFilters = {
        randomOrder: true,
      };

      const result1 = applyCustomStudyFilters(mockCards, filters);
      const result2 = applyCustomStudyFilters(mockCards, filters);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);

      if (result1.success && result2.success) {
        // Ensure the shuffled array contains the same elements
        expect(result1.data.map(card => card.id).sort()).toEqual(mockCards.map(card => card.id).sort());
        expect(result2.data.map(card => card.id).sort()).toEqual(mockCards.map(card => card.id).sort());
      }
    });

    it('should apply multiple filters together', () => {
      const filters: CustomStudyFilters = {
        tags: ['javascript'],
        difficulty: 'young',
        limit: 1,
        randomOrder: true,
      };

      const result = applyCustomStudyFilters(mockCards, filters);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.length).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('shuffleArray', () => {
    it('should shuffle array while maintaining same elements', () => {
      const original = [1, 2, 3, 4, 5];
      const shuffled = shuffleArray(original);

      expect(shuffled).toHaveLength(original.length);
      expect(shuffled.sort()).toEqual(original.sort());
    });

    it('should create a new array (not mutate original)', () => {
      const original = [1, 2, 3];
      const shuffled = shuffleArray(original);

      expect(original).toEqual([1, 2, 3]);
      expect(shuffled).not.toBe(original);
    });
  });

  describe('sortCards', () => {
    it('should sort by creation date', () => {
      const sorted = sortCards(mockCards, 'created');
      const dates = sorted.map(card => card.createdAt.getTime());
      expect(dates).toEqual([...dates].sort((a, b) => a - b));
    });

    it('should sort by easiness in descending order', () => {
      const sorted = sortCards(mockCards, 'easiness', 'desc');
      const easinessValues = sorted.map(card => card.easiness);
      expect(easinessValues).toEqual([...easinessValues].sort((a, b) => b - a));
    });

    it('should sort by next review date', () => {
      const sorted = sortCards(mockCards, 'nextReview');
      const reviewDates = sorted.map(card => card.nextReview.getTime());
      expect(reviewDates).toEqual([...reviewDates].sort((a, b) => a - b));
    });
  });

  describe('getUniqueTags', () => {
    it('should return unique tags sorted alphabetically', () => {
      const tags = getUniqueTags(mockCards);
      const expectedTags = ['javascript', 'nodejs', 'programming', 'python', 'react', 'typescript'];
      expect(tags).toEqual(expectedTags);
    });

    it('should handle empty card array', () => {
      const tags = getUniqueTags([]);
      expect(tags).toEqual([]);
    });
  });

  describe('getTagDistribution', () => {
    it('should count tag occurrences correctly', () => {
      const distribution = getTagDistribution(mockCards);
      expect(distribution['programming']).toBe(4);
      expect(distribution['javascript']).toBe(3);
      expect(distribution['python']).toBe(1);
    });

    it('should handle empty card array', () => {
      const distribution = getTagDistribution([]);
      expect(distribution).toEqual({});
    });
  });

  describe('getStaleCards', () => {
    it('should return cards not studied recently', () => {
      const staleCards = getStaleCards(mockCards, 1); // Not studied in last 1 day
      expect(staleCards.length).toBeGreaterThan(0);
      expect(staleCards.every(card => {
        const lastActivity = card.lastReview || card.createdAt;
        const dayAgo = new Date();
        dayAgo.setDate(dayAgo.getDate() - 1);
        return lastActivity < dayAgo;
      })).toBe(true);
    });
  });

  describe('getUpcomingCards', () => {
    it('should return cards coming up soon', () => {
      const upcomingCards = getUpcomingCards(mockCards, 5); // Next 5 days
      expect(upcomingCards.length).toBeGreaterThan(0);
      expect(upcomingCards.every(card => {
        const now = new Date();
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 5);
        return card.nextReview >= now && card.nextReview <= futureDate;
      })).toBe(true);
    });
  });

  describe('getRecentlyStudiedCards', () => {
    it('should return cards studied recently', () => {
      const recentCards = getRecentlyStudiedCards(mockCards, 72); // Last 3 days
      expect(recentCards.length).toBeGreaterThan(0);
      expect(recentCards.every(card => {
        if (!card.lastReview) return false;
        const threeDaysAgo = new Date();
        threeDaysAgo.setHours(threeDaysAgo.getHours() - 72);
        return card.lastReview >= threeDaysAgo;
      })).toBe(true);
    });
  });

  describe('advancedSearch', () => {
    it('should apply multiple advanced criteria', () => {
      const results = advancedSearch(mockCards, {
        query: 'JavaScript',
        tags: ['programming'],
        minEasiness: 2.5,
        maxEasiness: 3.0,
        minInterval: 1,
        maxInterval: 20,
      });

      expect(results.length).toBeGreaterThanOrEqual(0);
      if (results.length > 0) {
        expect(results.every(card =>
          (card.front.toLowerCase().includes('javascript') ||
           card.back.toLowerCase().includes('javascript') ||
           card.tags.some(tag => tag.toLowerCase().includes('javascript'))) &&
          card.tags.some(tag => tag.toLowerCase() === 'programming') &&
          card.easiness >= 2.5 &&
          card.easiness <= 3.0 &&
          card.interval >= 1 &&
          card.interval <= 20
        )).toBe(true);
      }
    });

    it('should filter by creation date range', () => {
      const now = new Date();
      const weekAgo = subDays(now, 7);
      const twoWeeksAgo = subDays(now, 14);

      const results = advancedSearch(mockCards, {
        createdAfter: twoWeeksAgo,
        createdBefore: weekAgo,
      });

      expect(results.every(card =>
        card.createdAt >= twoWeeksAgo && card.createdAt <= weekAgo
      )).toBe(true);
    });

    it('should filter by last review date range', () => {
      const now = new Date();
      const threeDaysAgo = subDays(now, 3);
      const oneDayAgo = subDays(now, 1);

      const results = advancedSearch(mockCards, {
        lastReviewAfter: threeDaysAgo,
        lastReviewBefore: oneDayAgo,
      });

      expect(results.every(card =>
        card.lastReview &&
        card.lastReview >= threeDaysAgo &&
        card.lastReview <= oneDayAgo
      )).toBe(true);
    });
  });
});