import { describe, it, expect } from 'vitest';
import {
  parseJsonWithDateRevival,
  serializeToJson,
  parseJson,
  isValidJson,
  formatBackupTimestamp,
  generateBackupFilename,
} from './json-operations';

describe('json-operations', () => {
  const mockDataStore = {
    cards: [
      {
        id: 'test-card-1',
        front: 'Test Question',
        back: 'Test Answer',
        tags: ['test'],
        easiness: 2.5,
        interval: 1,
        repetitions: 0,
        nextReview: '2025-01-01T12:00:00.000Z',
        lastReview: null,
        createdAt: '2025-01-01T10:00:00.000Z',
      },
    ],
    sessionHistory: [],
    learningStreak: {
      currentStreak: 0,
      longestStreak: 0,
      lastStudyDate: null,
      studyDates: [],
    },
    achievements: [],
  };

  describe('parseJsonWithDateRevival', () => {
    it('should parse valid JSON with date revival', () => {
      const jsonString = JSON.stringify(mockDataStore);
      const result = parseJsonWithDateRevival(jsonString);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.cards).toHaveLength(1);
        expect(result.data.cards[0].nextReview).toBeInstanceOf(Date);
        expect(result.data.cards[0].lastReview).toBeNull();
        expect(result.data.cards[0].createdAt).toBeInstanceOf(Date);
      }
    });

    it('should handle invalid JSON', () => {
      const result = parseJsonWithDateRevival('invalid json content');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Invalid JSON format');
      }
    });

    it('should handle non-object data', () => {
      const result = parseJsonWithDateRevival('"just a string"');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Invalid data structure');
      }
    });

    it('should handle missing fields with defaults', () => {
      const incompleteData = {
        cards: [
          {
            id: 'test',
            front: 'Q',
            back: 'A',
            nextReview: '2025-01-01T12:00:00.000Z',
            createdAt: '2025-01-01T10:00:00.000Z',
          },
        ],
      };

      const jsonString = JSON.stringify(incompleteData);
      const result = parseJsonWithDateRevival(jsonString);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.cards[0].tags).toEqual([]);
        expect(result.data.sessionHistory).toEqual([]);
        expect(result.data.learningStreak.currentStreak).toBe(0);
      }
    });
  });

  describe('serializeToJson', () => {
    it('should serialize data to JSON string', () => {
      const validatedData = {
        cards: [
          {
            id: 'test',
            front: 'Q',
            back: 'A',
            tags: [],
            easiness: 2.5,
            interval: 1,
            repetitions: 0,
            nextReview: new Date('2025-01-01T12:00:00.000Z'),
            lastReview: null,
            createdAt: new Date('2025-01-01T10:00:00.000Z'),
          },
        ],
        sessionHistory: [],
        learningStreak: {
          currentStreak: 0,
          longestStreak: 0,
          lastStudyDate: null,
          studyDates: [],
        },
        achievements: [],
      };

      const result = serializeToJson(validatedData as any);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(typeof result.data).toBe('string');
        expect(result.data).toContain('"front": "Q"');
      }
    });
  });

  describe('parseJson', () => {
    it('should parse JSON without validation', () => {
      const jsonString = '{"name": "test", "value": 42}';
      const result = parseJson(jsonString);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ name: 'test', value: 42 });
      }
    });

    it('should parse JSON with validation', () => {
      const jsonString = '{"name": "test", "value": 42}';
      const validator = (data: unknown) => {
        if (typeof data === 'object' && data !== null && 'name' in data) {
          return { ...data as any, validated: true };
        }
        throw new Error('Invalid structure');
      };

      const result = parseJson(jsonString, validator);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ name: 'test', value: 42, validated: true });
      }
    });

    it('should handle validation errors', () => {
      const jsonString = '{"name": "test", "value": 42}';
      const validator = () => {
        throw new Error('Validation failed');
      };

      const result = parseJson(jsonString, validator);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Validation failed');
      }
    });
  });

  describe('isValidJson', () => {
    it('should return true for valid JSON', () => {
      expect(isValidJson('{"test": true}')).toBe(true);
      expect(isValidJson('"string"')).toBe(true);
      expect(isValidJson('123')).toBe(true);
    });

    it('should return false for invalid JSON', () => {
      expect(isValidJson('invalid json')).toBe(false);
      expect(isValidJson('{incomplete')).toBe(false);
    });
  });

  describe('formatBackupTimestamp', () => {
    it('should format date for backup filename', () => {
      const date = new Date('2025-01-01T12:30:45.123Z');
      const result = formatBackupTimestamp(date);

      expect(result).toBe('2025-01-01T12-30-45-123Z');
    });

    it('should handle different dates consistently', () => {
      const date1 = new Date('2025-01-01T12:00:00.000Z');
      const date2 = new Date('2025-01-01T12:00:01.000Z');

      const result1 = formatBackupTimestamp(date1);
      const result2 = formatBackupTimestamp(date2);

      expect(result1).not.toBe(result2);
    });
  });

  describe('generateBackupFilename', () => {
    it('should generate backup filename with timestamp', () => {
      const originalPath = '/path/to/data.json';
      const fixedDate = new Date('2025-01-01T12:00:00.000Z');

      const result = generateBackupFilename(originalPath, fixedDate);

      expect(result).toBe('/path/to/data.backup.2025-01-01T12-00-00-000Z.json');
    });

    it('should use current time if no date provided', () => {
      const originalPath = '/path/to/data.json';

      const result = generateBackupFilename(originalPath);

      expect(result).toMatch(/.*\.backup\.\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z\.json$/);
    });
  });
});