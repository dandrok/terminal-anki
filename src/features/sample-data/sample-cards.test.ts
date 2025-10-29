import { describe, it, expect } from 'vitest';
import {
  SAMPLE_FLASHCARDS,
  createSampleFlashcards,
  getSampleCardsByCategory,
  getRandomSampleCards,
  getSampleCardsByDifficulty,
  SAMPLE_CATEGORIES,
  getSampleDataStats,
  validateSampleData,
  createTestCards,
  exportSampleDataAsJSON,
  exportSampleDataAsCSV
} from './sample-cards.js';
import { Flashcard } from '../../shared/types/flashcard.types.js';

describe('Sample Data', () => {
  describe('SAMPLE_FLASHCARDS', () => {
    it('should have the expected number of sample cards', () => {
      expect(SAMPLE_FLASHCARDS.length).toBe(5);
    });

    it('should have all required fields for each sample card', () => {
      SAMPLE_FLASHCARDS.forEach(card => {
        expect(card).toHaveProperty('front');
        expect(card).toHaveProperty('back');
        expect(card).toHaveProperty('tags');
        expect(card).toHaveProperty('easiness');
        expect(card).toHaveProperty('interval');
        expect(card).toHaveProperty('repetitions');
        expect(card).toHaveProperty('nextReview');
        expect(card).toHaveProperty('lastReview');

        expect(typeof card.front).toBe('string');
        expect(typeof card.back).toBe('string');
        expect(Array.isArray(card.tags)).toBe(true);
        expect(typeof card.easiness).toBe('number');
        expect(typeof card.interval).toBe('number');
        expect(typeof card.repetitions).toBe('number');
        expect(card.nextReview).toBeInstanceOf(Date);
      });
    });

    it('should have valid tag structures', () => {
      SAMPLE_FLASHCARDS.forEach(card => {
        expect(card.tags.length).toBeGreaterThan(0);
        card.tags.forEach(tag => {
          expect(typeof tag).toBe('string');
          expect(tag.length).toBeGreaterThan(0);
        });
      });
    });

    it('should have valid easiness values', () => {
      SAMPLE_FLASHCARDS.forEach(card => {
        expect(card.easiness).toBeGreaterThanOrEqual(1.3);
        expect(card.easiness).toBeLessThanOrEqual(3.0);
      });
    });
  });

  describe('createSampleFlashcards', () => {
    it('should create flashcards with proper IDs and timestamps', () => {
      const cards = createSampleFlashcards();

      expect(cards).toHaveLength(SAMPLE_FLASHCARDS.length);

      cards.forEach((card, index) => {
        expect(card.id).toBe(`sample-${index + 1}`);
        expect(card.createdAt).toBeInstanceOf(Date);
        expect(card.id).not.toBe(cards[index - 1]?.id); // Ensure unique IDs
      });
    });

    it('should preserve original data while adding IDs and timestamps', () => {
      const cards = createSampleFlashcards();

      cards.forEach((card, index) => {
        const originalCard = SAMPLE_FLASHCARDS[index];
        expect(card.front).toBe(originalCard.front);
        expect(card.back).toBe(originalCard.back);
        expect(card.tags).toEqual(originalCard.tags);
        expect(card.easiness).toBe(originalCard.easiness);
        expect(card.interval).toBe(originalCard.interval);
        expect(card.repetitions).toBe(originalCard.repetitions);
        expect(card.nextReview.getTime()).toBe(originalCard.nextReview.getTime());
        expect(card.lastReview).toBe(originalCard.lastReview);
      });
    });
  });

  describe('getSampleCardsByCategory', () => {
    it('should return cards matching the category', () => {
      const programmingCards = getSampleCardsByCategory('programming');
      expect(programmingCards.length).toBeGreaterThan(0);

      programmingCards.forEach(card => {
        expect(card.tags.some(tag => tag.toLowerCase().includes('programming'))).toBe(true);
      });
    });

    it('should be case insensitive', () => {
      const cards1 = getSampleCardsByCategory('Programming');
      const cards2 = getSampleCardsByCategory('programming');
      expect(cards1).toEqual(cards2);
    });

    it('should return empty array for non-existent category', () => {
      const cards = getSampleCardsByCategory('nonexistent');
      expect(cards).toHaveLength(0);
    });
  });

  describe('getRandomSampleCards', () => {
    it('should return requested number of cards', () => {
      const cards = getRandomSampleCards(3);
      expect(cards.length).toBe(3);
    });

    it('should not exceed available cards', () => {
      const totalCards = createSampleFlashcards().length;
      const cards = getRandomSampleCards(totalCards + 5);
      expect(cards.length).toBe(totalCards);
    });

    it('should return different order on multiple calls', () => {
      const cards1 = getRandomSampleCards(5);
      const cards2 = getRandomSampleCards(5);

      // Since we're getting all cards, they should be in different order
      const ordersAreDifferent = cards1.some((card, index) => card.id !== cards2[index]?.id);
      expect(ordersAreDifferent).toBe(true);
    });

    it('should handle zero request', () => {
      const cards = getRandomSampleCards(0);
      expect(cards).toHaveLength(0);
    });
  });

  describe('getSampleCardsByDifficulty', () => {
    it('should return beginner cards', () => {
      const beginnerCards = getSampleCardsByDifficulty('beginner');
      expect(beginnerCards.length).toBe(2);
      expect(beginnerCards.map(card => card.front)).toEqual(
        expect.arrayContaining(['Python', 'Algorithm'])
      );
    });

    it('should return intermediate cards', () => {
      const intermediateCards = getSampleCardsByDifficulty('intermediate');
      expect(intermediateCards.length).toBe(2);
      expect(intermediateCards.map(card => card.front)).toEqual(
        expect.arrayContaining(['Database', 'API (Application Programming Interface)'])
      );
    });

    it('should return advanced cards', () => {
      const advancedCards = getSampleCardsByDifficulty('advanced');
      expect(advancedCards.length).toBe(1);
      expect(advancedCards[0].front).toBe('Git');
    });
  });

  describe('SAMPLE_CATEGORIES', () => {
    it('should have expected categories', () => {
      expect(SAMPLE_CATEGORIES).toContain('programming');
      expect(SAMPLE_CATEGORIES).toContain('computer-science');
      expect(SAMPLE_CATEGORIES).toContain('database');
      expect(SAMPLE_CATEGORIES).toContain('web');
      expect(SAMPLE_CATEGORIES).toContain('tools');
      expect(SAMPLE_CATEGORIES).toContain('version-control');
      expect(SAMPLE_CATEGORIES).toContain('development');
    });

    it('should have unique categories', () => {
      const uniqueCategories = new Set(SAMPLE_CATEGORIES);
      expect(uniqueCategories.size).toBe(SAMPLE_CATEGORIES.length);
    });
  });

  describe('getSampleDataStats', () => {
    it('should return correct statistics', () => {
      const stats = getSampleDataStats();

      expect(stats.totalCards).toBe(SAMPLE_FLASHCARDS.length);
      expect(stats.uniqueTags).toBeGreaterThan(0);
      expect(stats.categories).toEqual(SAMPLE_CATEGORIES);
      expect(stats.averageFrontLength).toBeGreaterThan(0);
      expect(stats.averageBackLength).toBeGreaterThan(0);

      // Check tag distribution
      expect(typeof stats.tagDistribution).toBe('object');
      expect(Object.keys(stats.tagDistribution).length).toBe(stats.uniqueTags);
    });
  });

  describe('validateSampleData', () => {
    it('should validate sample data successfully', () => {
      expect(validateSampleData()).toBe(true);
    });
  });

  describe('createTestCards', () => {
    it('should create requested number of test cards', () => {
      const cards = createTestCards(10);
      expect(cards).toHaveLength(10);
    });

    it('should create cards with valid structure', () => {
      const cards = createTestCards(5);

      cards.forEach(card => {
        expect(card).toHaveProperty('id');
        expect(card).toHaveProperty('front');
        expect(card).toHaveProperty('back');
        expect(card).toHaveProperty('tags');
        expect(card).toHaveProperty('easiness');
        expect(card).toHaveProperty('interval');
        expect(card).toHaveProperty('repetitions');
        expect(card).toHaveProperty('nextReview');
        expect(card).toHaveProperty('createdAt');

        expect(typeof card.id).toBe('string');
        expect(typeof card.front).toBe('string');
        expect(typeof card.back).toBe('string');
        expect(Array.isArray(card.tags)).toBe(true);
        expect(card.easiness).toBeGreaterThanOrEqual(2.0);
        expect(card.easiness).toBeLessThanOrEqual(3.0);
        expect(card.interval).toBeGreaterThanOrEqual(1);
        expect(card.interval).toBeLessThanOrEqual(30);
        expect(card.repetitions).toBeGreaterThanOrEqual(0);
        expect(card.repetitions).toBeLessThanOrEqual(10);
        expect(card.nextReview).toBeInstanceOf(Date);
        expect(card.createdAt).toBeInstanceOf(Date);
      });
    });

    it('should create unique IDs', () => {
      const cards = createTestCards(10);
      const ids = cards.map(card => card.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should create realistic test data', () => {
      const cards = createTestCards(20);

      // Check that we have variety in the data
      const easinessValues = cards.map(card => card.easiness);
      const intervalValues = cards.map(card => card.interval);
      const repetitionValues = cards.map(card => card.repetitions);

      expect(Math.min(...easinessValues)).toBeLessThan(2.5);
      expect(Math.max(...easinessValues)).toBeGreaterThan(2.5);

      expect(Math.min(...intervalValues)).toBeLessThan(10);
      expect(Math.max(...intervalValues)).toBeGreaterThan(10);

      expect(Math.min(...repetitionValues)).toBeGreaterThanOrEqual(0);
      expect(Math.max(...repetitionValues)).toBeGreaterThan(0);
    });
  });

  describe('exportSampleDataAsJSON', () => {
    it('should export data as valid JSON', () => {
      const json = exportSampleDataAsJSON();
      expect(() => JSON.parse(json)).not.toThrow();

      const parsed = JSON.parse(json);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(SAMPLE_FLASHCARDS.length);
    });

    it('should export cards with all required fields', () => {
      const json = exportSampleDataAsJSON();
      const parsed = JSON.parse(json) as Flashcard[];

      parsed.forEach(card => {
        expect(card).toHaveProperty('id');
        expect(card).toHaveProperty('front');
        expect(card).toHaveProperty('back');
        expect(card).toHaveProperty('tags');
        expect(card).toHaveProperty('easiness');
        expect(card).toHaveProperty('interval');
        expect(card).toHaveProperty('repetitions');
        expect(card).toHaveProperty('nextReview');
        expect(card).toHaveProperty('lastReview');
        expect(card).toHaveProperty('createdAt');
      });
    });
  });

  describe('exportSampleDataAsCSV', () => {
    it('should export data as valid CSV', () => {
      const csv = exportSampleDataAsCSV();
      const lines = csv.split('\n');

      expect(lines.length).toBeGreaterThan(1); // Header + data rows
      expect(lines[0]).toBe(
        'ID,Front,Back,Tags,Easiness,Interval,Repetitions,Next Review,Last Review,Created At'
      );
    });

    it('should have correct number of data rows', () => {
      const csv = exportSampleDataAsCSV();
      const lines = csv.split('\n').filter(line => line.trim() !== '');

      expect(lines.length - 1).toBe(SAMPLE_FLASHCARDS.length); // -1 for header
    });

    it('should properly handle quotes in CSV', () => {
      const csv = exportSampleDataAsCSV();
      expect(() => {
        // Simple CSV parsing check
        const lines = csv.split('\n').filter(line => line.trim() !== ''); // Filter out empty lines
        const expectedDelimiterCount = 9; // 10 columns - 1

        lines.forEach(line => {
          // Count delimiters outside of quotes
          let delimiterCount = 0;
          let inQuote = false;
          for (let i = 0; i < line.length; i++) {
            if (line[i] === '"') {
              inQuote = !inQuote;
            } else if (line[i] === ',' && !inQuote) {
              delimiterCount++;
            }
          }
          expect(delimiterCount).toBe(expectedDelimiterCount);
        });
      }).not.toThrow();
    });
  });
});
