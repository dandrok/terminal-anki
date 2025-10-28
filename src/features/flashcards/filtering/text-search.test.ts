import { describe, it, expect } from 'vitest';
import { Flashcard } from '../domain';
import {
  normalizeText,
  matchesSearchQuery,
  searchCardsByField,
  fuzzySearchCards,
  calculateSimilarity,
  parseSearchQuery,
} from './text-search';

describe('text-search', () => {
  const mockCard: Flashcard = {
    id: 'test-card-1',
    front: 'What is TypeScript?',
    back: 'TypeScript is a typed superset of JavaScript',
    tags: ['programming', 'typescript', 'javascript'],
    easiness: 2.5,
    interval: 1,
    repetitions: 0,
    nextReview: new Date(),
    lastReview: null,
    createdAt: new Date(),
  };

  const mockCards: Flashcard[] = [
    mockCard,
    {
      id: 'test-card-2',
      front: 'What is React?',
      back: 'React is a JavaScript library for building user interfaces',
      tags: ['programming', 'react', 'javascript'],
      easiness: 2.8,
      interval: 3,
      repetitions: 2,
      nextReview: new Date(),
      lastReview: new Date(),
      createdAt: new Date(),
    },
    {
      id: 'test-card-3',
      front: 'What is Node.js?',
      back: 'Node.js is a JavaScript runtime built on Chrome\'s V8 engine',
      tags: ['programming', 'nodejs', 'javascript'],
      easiness: 2.3,
      interval: 7,
      repetitions: 4,
      nextReview: new Date(),
      lastReview: new Date(),
      createdAt: new Date(),
    },
  ];

  describe('normalizeText', () => {
    it('should normalize text to lowercase and trim', () => {
      expect(normalizeText('  HeLLo WoRLd  ')).toBe('hello world');
    });

    it('should handle empty string', () => {
      expect(normalizeText('')).toBe('');
    });

    it('should handle whitespace only', () => {
      expect(normalizeText('   ')).toBe('');
    });
  });

  describe('matchesSearchQuery', () => {
    it('should match text in front field', () => {
      expect(matchesSearchQuery(mockCard, 'typescript')).toBe(true);
    });

    it('should match text in back field', () => {
      expect(matchesSearchQuery(mockCard, 'superset')).toBe(true);
    });

    it('should match text in tags', () => {
      expect(matchesSearchQuery(mockCard, 'programming')).toBe(true);
    });

    it('should be case insensitive', () => {
      expect(matchesSearchQuery(mockCard, 'TYPESCRIPT')).toBe(true);
    });

    it('should return true for empty query', () => {
      expect(matchesSearchQuery(mockCard, '')).toBe(true);
    });

    it('should return false for non-matching query', () => {
      expect(matchesSearchQuery(mockCard, 'nonexistent')).toBe(false);
    });

    it('should handle partial matches', () => {
      expect(matchesSearchQuery(mockCard, 'type')).toBe(true);
    });
  });

  describe('searchCardsByField', () => {
    it('should search in all fields by default', () => {
      const results = searchCardsByField(mockCards, 'javascript');
      expect(results).toHaveLength(3);
    });

    it('should search only in front field', () => {
      const results = searchCardsByField(mockCards, 'what is', {
        searchInFront: true,
        searchInBack: false,
        searchInTags: false,
      });
      expect(results).toHaveLength(3);
    });

    it('should search only in back field', () => {
      const results = searchCardsByField(mockCards, 'library', {
        searchInFront: false,
        searchInBack: true,
        searchInTags: false,
      });
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('test-card-2');
    });

    it('should search only in tags', () => {
      const results = searchCardsByField(mockCards, 'react', {
        searchInFront: false,
        searchInBack: false,
        searchInTags: true,
      });
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('test-card-2');
    });

    it('should return all cards for empty query', () => {
      const results = searchCardsByField(mockCards, '');
      expect(results).toHaveLength(3);
    });
  });

  describe('fuzzySearchCards', () => {
    it('should return fuzzy search results with scores', () => {
      const results = fuzzySearchCards(mockCards, 'javas');
      expect(results).toHaveLength(3);
      expect(results[0].score).toBeGreaterThan(0);
    });

    it('should return exact matches with score 1', () => {
      const results = fuzzySearchCards(mockCards, 'javascript');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.score === 1)).toBe(true);
    });

    it('should respect minimum score threshold', () => {
      const results = fuzzySearchCards(mockCards, 'xyz', 0.5);
      expect(results).toHaveLength(0);
    });

    it('should return all cards with score 1 for empty query', () => {
      const results = fuzzySearchCards(mockCards, '');
      expect(results).toHaveLength(3);
      expect(results.every(r => r.score === 1)).toBe(true);
    });

    it('should sort results by score (highest first)', () => {
      const results = fuzzySearchCards(mockCards, 'script');
      expect(results.length).toBeGreaterThanOrEqual(2); // typescript, javascript
      expect(results[0].score).toBeGreaterThanOrEqual(results[1].score);
    });
  });

  describe('calculateSimilarity', () => {
    it('should return 1 for identical strings', () => {
      expect(calculateSimilarity('hello', 'hello')).toBe(1);
    });

    it('should return 0 for completely different strings', () => {
      expect(calculateSimilarity('abc', 'xyz')).toBe(0);
    });

    it('should return 0 for empty strings', () => {
      expect(calculateSimilarity('', 'anything')).toBe(0);
    });

    it('should detect containment', () => {
      expect(calculateSimilarity('hello world', 'hello')).toBeGreaterThan(0);
      expect(calculateSimilarity('hello', 'hello world')).toBeGreaterThan(0);
    });

    it('should calculate character overlap similarity', () => {
      const similarity = calculateSimilarity('hello', 'help');
      expect(similarity).toBeGreaterThan(0);
      expect(similarity).toBeLessThan(1);
    });
  });

  describe('parseSearchQuery', () => {
    it('should parse simple terms', () => {
      const result = parseSearchQuery('typescript javascript react');
      expect(result.terms).toEqual(['typescript', 'javascript', 'react']);
      expect(result.phrases).toEqual([]);
      expect(result.excludeTerms).toEqual([]);
    });

    it('should parse quoted phrases', () => {
      const result = parseSearchQuery('"what is" typescript "react hooks"');
      expect(result.terms).toEqual(['typescript']);
      expect(result.phrases).toEqual(['what is', 'react hooks']);
      expect(result.excludeTerms).toEqual([]);
    });

    it('should parse exclude terms', () => {
      const result = parseSearchQuery('typescript -javascript react');
      expect(result.terms).toEqual(['typescript', 'react']);
      expect(result.excludeTerms).toEqual(['javascript']);
    });

    it('should handle mixed query types', () => {
      const result = parseSearchQuery('"front end" typescript -javascript -react');
      expect(result.terms).toEqual(['typescript']);
      expect(result.phrases).toEqual(['front end']);
      expect(result.excludeTerms).toEqual(['javascript', 'react']);
    });

    it('should handle empty query', () => {
      const result = parseSearchQuery('');
      expect(result.terms).toEqual([]);
      expect(result.phrases).toEqual([]);
      expect(result.excludeTerms).toEqual([]);
    });
  });
});