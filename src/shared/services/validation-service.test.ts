import { describe, it, expect } from 'vitest';
import { ValidationService } from './validation-service.js';
import { Flashcard, CustomStudyFilters, ReviewQuality } from '../../features/flashcards/domain.js';

describe('ValidationService', () => {
  let validationService: ValidationService;

  beforeEach(() => {
    validationService = new ValidationService();
  });

  describe('Flashcard Validation', () => {
    it('should validate a correct flashcard', () => {
      const flashcard = {
        id: 'test-card-1',
        front: 'Test Question',
        back: 'Test Answer',
        tags: ['test', 'example'],
        easiness: 2.5,
        interval: 1,
        repetitions: 0,
        nextReview: new Date(),
        lastReview: null,
        createdAt: new Date(),
      };

      const result = validationService.validateFlashcard(flashcard);

      expect(result.isValid).toBe(true);
      expect(result.data).toEqual(flashcard);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject flashcard with invalid front', () => {
      const flashcard = {
        id: 'test-card-1',
        front: '', // Empty front
        back: 'Test Answer',
        tags: ['test'],
        easiness: 2.5,
        interval: 1,
        repetitions: 0,
        nextReview: new Date(),
        lastReview: null,
        createdAt: new Date(),
      };

      const result = validationService.validateFlashcard(flashcard);

      expect(result.isValid).toBe(false);
      expect(result.data).toBeUndefined();
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject flashcard with invalid easiness', () => {
      const flashcard = {
        id: 'test-card-1',
        front: 'Test Question',
        back: 'Test Answer',
        tags: ['test'],
        easiness: 5.0, // Too high
        interval: 1,
        repetitions: 0,
        nextReview: new Date(),
        lastReview: null,
        createdAt: new Date(),
      };

      const result = validationService.validateFlashcard(flashcard);

      expect(result.isValid).toBe(false);
      expect(result.data).toBeUndefined();
      expect(result.errors.some(error => error.includes('easiness'))).toBe(true);
    });
  });

  describe('Review Quality Validation', () => {
    it('should validate correct review qualities', () => {
      for (const quality of [0, 1, 2, 3, 4, 5] as ReviewQuality[]) {
        const result = validationService.validateReviewQuality(quality);
        expect(result.isValid).toBe(true);
        expect(result.data).toBe(quality);
      }
    });

    it('should reject invalid review qualities', () => {
      const invalidQualities = [-1, 6, 3.5, '3', null, undefined];

      for (const quality of invalidQualities) {
        const result = validationService.validateReviewQuality(quality);
        expect(result.isValid).toBe(false);
      }
    });
  });

  describe('Custom Study Filters Validation', () => {
    it('should validate correct filters', () => {
      const filters = {
        query: 'test',
        tags: ['tag1', 'tag2'],
        difficulty: 'new' as const,
        includeDue: true,
        limit: 10,
        randomOrder: false,
      };

      const result = validationService.validateCustomStudyFilters(filters);

      expect(result.isValid).toBe(true);
      expect(result.data).toEqual(filters);
    });

    it('should accept partial filters', () => {
      const filters = {
        query: 'test',
        limit: 5,
      };

      const result = validationService.validateCustomStudyFilters(filters);

      expect(result.isValid).toBe(true);
    });

    it('should reject invalid difficulty', () => {
      const filters = {
        difficulty: 'invalid',
      };

      const result = validationService.validateCustomStudyFilters(filters);

      expect(result.isValid).toBe(false);
    });

    it('should reject negative limit', () => {
      const filters = {
        limit: -5,
      };

      const result = validationService.validateCustomStudyFilters(filters);

      expect(result.isValid).toBe(false);
    });
  });

  describe('String Validation', () => {
    it('should validate correct strings', () => {
      const result = validationService.validateString('Hello World');
      expect(result.isValid).toBe(true);
      expect(result.data).toBe('Hello World');
    });

    it('should trim whitespace', () => {
      const result = validationService.validateString('  Hello World  ');
      expect(result.isValid).toBe(true);
      expect(result.data).toBe('Hello World');
    });

    it('should enforce minimum length', () => {
      const result = validationService.validateString('', 1);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('String must be at least 1 characters long');
    });

    it('should enforce maximum length', () => {
      const result = validationService.validateString('a'.repeat(101), 1, 100);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('String must be no more than 100 characters long');
    });

    it('should reject non-strings', () => {
      const values = [123, true, {}, [], null, undefined];

      for (const value of values) {
        const result = validationService.validateString(value);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Value must be a string');
      }
    });
  });

  describe('String Array Validation', () => {
    it('should validate correct string arrays', () => {
      const result = validationService.validateStringArray(['tag1', 'tag2', 'tag3']);
      expect(result.isValid).toBe(true);
      expect(result.data).toEqual(['tag1', 'tag2', 'tag3']);
    });

    it('should trim and lowercase strings', () => {
      const result = validationService.validateStringArray(['  Tag1  ', 'TAG2']);
      expect(result.isValid).toBe(true);
      expect(result.data).toEqual(['tag1', 'tag2']);
    });

    it('should filter out empty strings', () => {
      const result = validationService.validateStringArray(['tag1', '', 'tag2']);
      expect(result.isValid).toBe(true);
      expect(result.data).toEqual(['tag1', 'tag2']);
    });

    it('should reject non-arrays', () => {
      const values = ['string', 123, true, {}, null, undefined];

      for (const value of values) {
        const result = validationService.validateStringArray(value);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Value must be an array');
      }
    });

    it('should reject arrays with too many items', () => {
      const largeArray = Array(51).fill('tag');
      const result = validationService.validateStringArray(largeArray, 50);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Array cannot contain more than 50 items');
    });

    it('should reject arrays with non-string items', () => {
      const result = validationService.validateStringArray(['tag1', 123, 'tag2']);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Item at index 1 must be a string');
    });
  });

  describe('Number Validation', () => {
    it('should validate correct numbers', () => {
      const result = validationService.validateNumber(42, 0, 100);
      expect(result.isValid).toBe(true);
      expect(result.data).toBe(42);
    });

    it('should enforce minimum value', () => {
      const result = validationService.validateNumber(-5, 0, 100);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Number must be at least 0');
    });

    it('should enforce maximum value', () => {
      const result = validationService.validateNumber(150, 0, 100);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Number must be no more than 100');
    });

    it('should reject non-numbers', () => {
      const values = ['42', true, {}, [], null, undefined, NaN];

      for (const value of values) {
        const result = validationService.validateNumber(value);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Value must be a valid number');
      }
    });
  });

  describe('Date Validation', () => {
    it('should validate Date objects', () => {
      const date = new Date();
      const result = validationService.validateDate(date);
      expect(result.isValid).toBe(true);
      expect(result.data).toBe(date);
    });

    it('should validate date strings', () => {
      const dateString = '2025-01-01T00:00:00.000Z';
      const result = validationService.validateDate(dateString);
      expect(result.isValid).toBe(true);
      expect(result.data).toEqual(new Date(dateString));
    });

    it('should validate timestamps', () => {
      const timestamp = Date.now();
      const result = validationService.validateDate(timestamp);
      expect(result.isValid).toBe(true);
      expect(result.data).toEqual(new Date(timestamp));
    });

    it('should reject invalid dates', () => {
      const invalidDate = new Date('invalid');
      const result = validationService.validateDate(invalidDate);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid date');
    });

    it('should reject invalid date strings', () => {
      const result = validationService.validateDate('not a date');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Value must be a valid date');
    });
  });

  describe('Card ID Validation', () => {
    it('should validate correct card IDs', () => {
      const validIds = ['card-123', 'card_456', 'abc123', '123456'];

      for (const id of validIds) {
        const result = validationService.validateCardId(id);
        expect(result.isValid).toBe(true);
        expect(result.data).toBe(id);
      }
    });

    it('should reject invalid card IDs', () => {
      const invalidIds = ['card@123', 'card 456', 'card#123', 'card-123-', '-card123', ''];

      for (const id of invalidIds) {
        const result = validationService.validateCardId(id);
        expect(result.isValid).toBe(false);
      }
    });

    it('should enforce length limits', () => {
      const tooLongId = 'a'.repeat(101);
      const result = validationService.validateCardId(tooLongId);
      expect(result.isValid).toBe(false);
    });
  });

  describe('Batch Validation', () => {
    it('should validate all items in a batch', () => {
      const items = [
        { front: 'Question 1', back: 'Answer 1' },
        { front: 'Question 2', back: 'Answer 2' },
      ];

      const result = validationService.validateBatch(
        items,
        (item) => validationService.validateString(item.front, 1, 100)
      );

      expect(result.isValid).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    it('should collect all validation errors in a batch', () => {
      const items = [
        { front: '', back: 'Answer 1' }, // Empty front
        { front: 'Question 2', back: 'Answer 2' },
        { front: null, back: 'Answer 3' }, // Invalid front
      ];

      const result = validationService.validateBatch(
        items,
        (item) => validationService.validateString(item.front, 1, 100)
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(2); // At least two invalid items
      expect(result.errors.some(error => error.includes('Item 0:'))).toBe(true);
      expect(result.errors.some(error => error.includes('Item 2:'))).toBe(true);
    });
  });
});