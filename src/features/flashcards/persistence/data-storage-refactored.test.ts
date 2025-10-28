import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { tmpdir } from 'os';
import {
  loadData,
  saveData,
  updateData,
  backupData,
  restoreFromBackup,
  getDataStats,
  validateData,
  clearAllData,
  exportData,
  importData,
} from './data-storage-refactored';
import { ValidatedDataStore } from '../../../shared/schemas/session.schema.js';

describe('data-storage-refactored', () => {
  const testDir = path.join(tmpdir(), 'data-storage-test');
  const testDataFile = path.join(testDir, 'flashcards.json');

  // Mock the DATA_FILE constant
  const originalModulePath = path.join(__dirname, 'data-storage-refactored.ts');

  const mockDataStore: ValidatedDataStore = {
    cards: [
      {
        id: 'test-card-1',
        front: 'Test Question',
        back: 'Test Answer',
        tags: ['test'],
        easiness: 2.5,
        interval: 1,
        repetitions: 0,
        nextReview: new Date('2025-01-01T12:00:00.000Z'),
        lastReview: null,
        createdAt: new Date('2025-01-01T10:00:00.000Z'),
      },
    ],
    sessionHistory: [
      {
        id: 'test-session-1',
        startTime: new Date('2025-01-01T12:00:00.000Z'),
        endTime: new Date('2025-01-01T12:30:00.000Z'),
        cardsStudied: 5,
        correctAnswers: 4,
        incorrectAnswers: 1,
        averageDifficulty: 2.5,
        sessionType: 'due' as const,
        quitEarly: false,
      },
    ],
    learningStreak: {
      currentStreak: 3,
      longestStreak: 7,
      lastStudyDate: new Date('2025-01-01T12:00:00.000Z'),
      studyDates: ['2025-01-01'],
    },
    achievements: [
      {
        id: 'first-card',
        name: 'First Steps',
        description: 'Create your first flashcard',
        icon: '🎯',
        category: 'cards' as const,
        progress: {
          current: 1,
          required: 1,
          description: 'Create your first flashcard',
        },
        unlockedAt: new Date('2025-01-01T12:00:00.000Z'),
        unlockedBy: 'system',
      },
    ],
  };

  beforeEach(async () => {
    // Clean up any existing test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore if directory doesn't exist
    }

    // Create test directory
    await fs.mkdir(testDir, { recursive: true });

    // Create initial data file
    await fs.writeFile(testDataFile, JSON.stringify(mockDataStore, null, 2));
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore if directory doesn't exist
    }
  });

  // Note: Since the refactored module uses a hardcoded DATA_FILE path,
  // these tests will work with the actual flashcards.json file in the project
  describe('loadData', () => {
    it('should load data successfully', () => {
      const result = loadData();
      expect(result.success).toBe(true);
    });

    it('should return empty data store when file does not exist', async () => {
      // Temporarily rename the actual data file
      try {
        await fs.rename('flashcards.json', 'flashcards.json.backup');
        const result = loadData();
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.cards).toEqual([]);
          expect(result.data.sessionHistory).toEqual([]);
        }
      } finally {
        // Restore the file
        try {
          await fs.rename('flashcards.json.backup', 'flashcards.json');
        } catch {
          // Ignore if file doesn't exist
        }
      }
    });
  });

  describe('saveData', () => {
    it('should save data successfully', () => {
      const result = saveData(mockDataStore);
      expect(result.success).toBe(true);
    });

    it('should save and then load the same data', () => {
      const saveResult = saveData(mockDataStore);
      expect(saveResult.success).toBe(true);

      const loadResult = loadData();
      expect(loadResult.success).toBe(true);
      if (loadResult.success) {
        expect(loadResult.data.cards).toHaveLength(1);
        expect(loadResult.data.cards[0].id).toBe('test-card-1');
      }
    });
  });

  describe('updateData', () => {
    it('should update data successfully', () => {
      const result = updateData((data) => ({
        ...data,
        cards: [...data.cards, {
          id: 'new-card',
          front: 'New Question',
          back: 'New Answer',
          tags: ['new'],
          easiness: 2.5,
          interval: 1,
          repetitions: 0,
          nextReview: new Date(),
          lastReview: null,
          createdAt: new Date(),
        }],
      }));

      expect(result.success).toBe(true);

      const loadResult = loadData();
      if (loadResult.success) {
        expect(loadResult.data.cards).toHaveLength(2);
        expect(loadResult.data.cards.some(card => card.id === 'new-card')).toBe(true);
      }
    });
  });

  describe('backupData', () => {
    it('should create backup successfully', () => {
      const result = backupData();
      expect(result.success).toBe(true);
    });

    it('should create backup with custom path', () => {
      const customPath = path.join(testDir, 'custom-backup.json');
      const result = backupData(customPath);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(customPath);
      }
    });
  });

  describe('validateData', () => {
    it('should validate data successfully', () => {
      const result = validateData();
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isValid).toBe(true);
        expect(result.data.issues).toEqual([]);
      }
    });
  });

  describe('exportData', () => {
    it('should export data as JSON string', () => {
      const result = exportData();
      expect(result.success).toBe(true);
      if (result.success) {
        expect(typeof result.data).toBe('string');
        expect(result.data).toContain('"test-card-1"');
      }
    });
  });

  describe('importData', () => {
    it('should import data from JSON string', () => {
      const jsonString = JSON.stringify(mockDataStore);
      const result = importData(jsonString);
      expect(result.success).toBe(true);
    });

    it('should reject invalid JSON', () => {
      const result = importData('invalid json content');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Invalid import data format');
      }
    });
  });

  describe('getDataStats', () => {
    it('should get data statistics', () => {
      const result = getDataStats();
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.cardCount).toBeGreaterThanOrEqual(0);
        expect(result.data.fileSize).toBeGreaterThanOrEqual(0);
        expect(result.data.lastModified).toBeInstanceOf(Date);
      }
    });
  });
});