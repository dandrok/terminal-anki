import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { tmpdir } from 'os';

const mockFiles: Record<string, string> = {};

vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn((path: string) => path in mockFiles),
    readFileSync: vi.fn((path: string) => {
      if (path in mockFiles) {
        return Buffer.from(mockFiles[path]);
      }
      throw new Error(`ENOENT: no such file or directory, open '${path}'`);
    }),
    writeFileSync: vi.fn((path: string, data: string) => {
      mockFiles[path] = data;
    }),
    mkdirSync: vi.fn(() => {}),
    unlinkSync: vi.fn((path: string) => delete mockFiles[path]),
    statSync: vi.fn(() => ({ size: 100, mtime: new Date() })),
    cpSync: vi.fn((src: string, dest: string) => (mockFiles[dest] = mockFiles[src])),
    copyFileSync: vi.fn((src: string, dest: string) => (mockFiles[dest] = mockFiles[src])),
  },
  existsSync: vi.fn((path: string) => path in mockFiles),
  readFileSync: vi.fn((path: string) => {
    if (path in mockFiles) {
      return Buffer.from(mockFiles[path]);
    }
    throw new Error(`ENOENT: no such file or directory, open '${path}'`);
  }),
  writeFileSync: vi.fn((path: string, data: string) => {
    mockFiles[path] = data;
  }),
  mkdirSync: vi.fn(() => {}),
  unlinkSync: vi.fn((path: string) => delete mockFiles[path]),
  statSync: vi.fn(() => ({ size: 100, mtime: new Date() })),
  cpSync: vi.fn((src: string, dest: string) => (mockFiles[dest] = mockFiles[src])),
  copyFileSync: vi.fn((src: string, dest: string) => (mockFiles[dest] = mockFiles[src])),
}));

import { 
  loadData, 
  saveData, 
  updateData, 
  backupData, 
  getDataStats, 
  validateDataIntegrity, 
  clearAllData, 
  restoreFromBackup, 
  DataStore 
} from './data-storage.js';



// Mock the DATA_FILE constant - we need to mock path.join and the module resolution
vi.mock('path', () => ({
  default: {
    join: vi.fn((...args: string[]) => {
      // Return our test file path when it matches the expected pattern
      if (args.join('').includes('flashcards.json')) {
        return '/tmp/test-anki.json';
      }
      return args.join('/');
    }),
    dirname: vi.fn(() => '/test/dir'),
  },
  join: vi.fn((...args: string[]) => {
    // Return our test file path when it matches the expected pattern
    if (args.join('').includes('flashcards.json')) {
      return '/tmp/test-anki.json';
    }
    return args.join('/');
  }),
  dirname: vi.fn(() => '/test/dir'),
}));

vi.mock('url', () => ({
  default: {
    fileURLToPath: vi.fn(() => '/test/fake/path/data-storage.js'),
  },
  fileURLToPath: vi.fn(() => '/test/fake/path/data-storage.js'),
}));

// Test with temporary files
const TEST_DATA_FILE = '/tmp/test-anki.json'; // Use a fixed path for mocked fs



// Mock the data file path
const originalDataFile = process.env.TEST_DATA_FILE;
beforeEach(() => {
  process.env.TEST_DATA_FILE = TEST_DATA_FILE;
  // Clear mock files before each test
  for (const key in mockFiles) {
    delete mockFiles[key];
  }
  vi.clearAllMocks(); // Clear all Vitest mocks

});

afterEach(() => {
  // No need for fs.existsSync and fs.unlinkSync with mocked fs
  // Clear mock files after each test
  for (const key in mockFiles) {
    delete mockFiles[key];
  }
  process.env.TEST_DATA_FILE = originalDataFile;
  vi.restoreAllMocks();
});

describe('Data Storage', () => {
  const createMockDataStore = (): DataStore => ({
    cards: [
      {
        id: 'test-card-1',
        front: 'Test Question',
        back: 'Test Answer',
        tags: ['test'],
        easiness: 2.5,
        interval: 1,
        repetitions: 0,
        nextReview: new Date(),
        lastReview: null,
        createdAt: new Date(),
      },
    ],
    sessionHistory: [
      {
        id: 'test-session-1',
        startTime: new Date(),
        endTime: new Date(),
        cardsStudied: 10,
        correctAnswers: 8,
        incorrectAnswers: 2,
        averageDifficulty: 2.5,
        sessionType: 'due',
        quitEarly: false,
      },
    ],
    learningStreak: {
      currentStreak: 5,
      longestStreak: 10,
      lastStudyDate: new Date(),
      studyDates: ['2023-01-01', '2023-01-02', '2023-01-03', '2023-01-04', '2023-01-05'],
    },
    achievements: [
      {
        id: 'first-card',
        name: 'First Steps',
        description: 'Create your first flashcard',
        icon: '◎',
        category: 'cards',
        progress: { current: 1, required: 1, description: 'cards created' },
        unlockedAt: new Date(),
      },
    ],
  });

  describe('loadData', () => {
    it('should return empty data store when file does not exist', () => {
      const result = loadData();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.cards).toEqual([]);
        expect(result.data.sessionHistory).toEqual([]);
        expect(result.data.learningStreak.currentStreak).toBe(0);
        expect(result.data.achievements).toEqual([]);
      }
    });

    it('should load data from existing file', () => {
      const testData = createMockDataStore();
      const saveResult = saveData(testData);
      expect(saveResult.success).toBe(true);

      const loadResult = loadData();

      expect(loadResult.success).toBe(true);
      if (loadResult.success) {
        expect(loadResult.data.cards).toHaveLength(1);
        expect(loadResult.data.cards[0].id).toBe('test-card-1');
        expect(loadResult.data.sessionHistory).toHaveLength(1);
        expect(loadResult.data.achievements).toHaveLength(1);
        expect(loadResult.data.learningStreak.currentStreak).toBe(5);
      }
    });

    it('should handle malformed JSON gracefully', () => {
      // Put invalid JSON in the mock file
      mockFiles[TEST_DATA_FILE] = 'invalid json content';

      const result = loadData();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(Error);
      }

      // Clean up
      delete mockFiles[TEST_DATA_FILE];
    });

    it('should revive dates correctly', () => {
      const testData = createMockDataStore();
      const saveResult = saveData(testData);
      expect(saveResult.success).toBe(true);

      const loadResult = loadData();

      expect(loadResult.success).toBe(true);
      if (loadResult.success) {
        expect(loadResult.data.cards[0].nextReview).toBeInstanceOf(Date);
        expect(loadResult.data.sessionHistory[0].startTime).toBeInstanceOf(Date);
        expect(loadResult.data.learningStreak.lastStudyDate).toBeInstanceOf(Date);
        expect(loadResult.data.achievements[0].unlockedAt).toBeInstanceOf(Date);
      }
    });

    it('should handle backward compatibility for missing tags', () => {
      const dataWithoutTags = {
        ...createMockDataStore(),
        cards: [{
          id: 'test-card-no-tags',
          front: 'Q',
          back: 'A',
          tags: undefined, // Explicitly undefined
          easiness: 2.5,
          interval: 1,
          repetitions: 0,
          nextReview: new Date(),
          lastReview: null,
          createdAt: new Date(),
        }],
      };

      fs.writeFileSync(TEST_DATA_FILE, JSON.stringify(dataWithoutTags));

      const result = loadData();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.cards[0].tags).toEqual([]);
      }
    });
  });

  describe('saveData', () => {
    it('should save data to file successfully', () => {
      const testData = createMockDataStore();

      const result = saveData(testData);

      expect(result.success).toBe(true);
      expect(fs.existsSync(TEST_DATA_FILE)).toBe(true);

      const fileContent = fs.readFileSync(TEST_DATA_FILE, 'utf-8');
      const parsed = JSON.parse(fileContent);
      expect(parsed.cards).toHaveLength(1);
      expect(parsed.cards[0].id).toBe('test-card-1');
    });

    it('should create directory if it does not exist', () => {
      const testData = createMockDataStore();
      // Ensure the directory does not exist initially in our mock
      vi.mocked(fs).existsSync.mockReturnValueOnce(false);

      const result = saveData(testData);

      expect(result.success).toBe(true);
      expect(vi.mocked(fs).mkdirSync).toHaveBeenCalled();
    });
  });

  describe('updateData', () => {
    it('should update data atomically', () => {
      const initialData = createMockDataStore();
      const saveResult = saveData(initialData);
      expect(saveResult.success).toBe(true);

      const updateResult = updateData((data) => ({
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

      expect(updateResult.success).toBe(true);

      const loadResult = loadData();
      expect(loadResult.success).toBe(true);
      if (loadResult.success) {
        expect(loadResult.data.cards).toHaveLength(2);
        expect(loadResult.data.cards[1].id).toBe('new-card');
      }
    });

    it('should handle load failures gracefully', () => {
      // Write invalid JSON to simulate load failure
      fs.writeFileSync(TEST_DATA_FILE, 'invalid json');

      const updateResult = updateData((data) => data);

      expect(updateResult.success).toBe(false);
    });
  });

  describe('backupData', () => {
    it('should create backup successfully', () => {
      const testData = createMockDataStore();
      saveData(testData);

      const backupResult = backupData();

      expect(backupResult.success).toBe(true);
      if (backupResult.success) {
        expect(fs.existsSync(backupResult.data)).toBe(true);
        const backupContent = fs.readFileSync(backupResult.data, 'utf-8');
        const parsed = JSON.parse(backupContent);
        expect(parsed.cards).toHaveLength(1);
      }
    });

    it('should return error when no data file exists', () => {
      const backupResult = backupData();

      expect(backupResult.success).toBe(false);
      if (!backupResult.success) {
        expect(backupResult.error.message).toBe('No data file to backup');
      }
    });
  });

  describe('getDataStats', () => {
    it('should return correct stats for existing data', () => {
      const testData = createMockDataStore();
      saveData(testData);

      const statsResult = getDataStats();

      expect(statsResult.success).toBe(true);
      if (statsResult.success) {
        expect(statsResult.data.cardCount).toBe(1);
        expect(statsResult.data.sessionCount).toBe(1);
        expect(statsResult.data.achievementCount).toBe(1);
        expect(statsResult.data.fileSize).toBeGreaterThan(0);
        expect(statsResult.data.lastModified).toBeInstanceOf(Date);
      }
    });

    it('should return zero stats for non-existent file', () => {
      const statsResult = getDataStats();

      expect(statsResult.success).toBe(true);
      if (statsResult.success) {
        expect(statsResult.data.cardCount).toBe(0);
        expect(statsResult.data.sessionCount).toBe(0);
        expect(statsResult.data.achievementCount).toBe(0);
        expect(statsResult.data.fileSize).toBe(0);
      }
    });
  });

  describe('validateDataIntegrity', () => {
    it('should validate correct data', () => {
      const testData = createMockDataStore();
      saveData(testData);

      const validationResult = validateDataIntegrity();

      expect(validationResult.success).toBe(true);
      if (validationResult.success) {
        expect(validationResult.data.isValid).toBe(true);
        expect(validationResult.data.issues).toEqual([]);
      }
    });

    it('should detect invalid card data', () => {
      const invalidData = {
        ...createMockDataStore(),
        cards: [
          {
            id: '', // Invalid empty ID
            front: 'Test Question',
            back: 'Test Answer',
            tags: ['test'],
            easiness: 2.5,
            interval: 1,
            repetitions: 0,
            nextReview: new Date(),
            lastReview: null,
            createdAt: new Date(),
          },
        ],
      };
      saveData(invalidData);

      const validationResult = validateDataIntegrity();

      expect(validationResult.success).toBe(true);
      if (validationResult.success) {
        expect(validationResult.data.isValid).toBe(false);
        expect(validationResult.data.issues).toContain('Card 0: Missing or invalid ID');
      }
    });

    it('should detect duplicate card IDs', () => {
      const duplicateData = {
        ...createMockDataStore(),
        cards: [
          createMockDataStore().cards[0],
          { ...createMockDataStore().cards[0], id: 'duplicate-id' },
          { ...createMockDataStore().cards[0], id: 'duplicate-id' },
        ],
      };
      saveData(duplicateData);

      const validationResult = validateDataIntegrity();

      expect(validationResult.success).toBe(true);
      if (validationResult.success) {
        expect(validationResult.data.isValid).toBe(false);
        expect(validationResult.data.issues.some(issue => issue.includes('Duplicate card IDs'))).toBe(true);
      }
    });
  });

  describe('clearAllData', () => {
    it('should clear all data and create backup', () => {
      const testData = createMockDataStore();
      saveData(testData);

      const clearResult = clearAllData();

      expect(clearResult.success).toBe(true);

      const loadResult = loadData();
      expect(loadResult.success).toBe(true);
      if (loadResult.success) {
        expect(loadResult.data.cards).toEqual([]);
        expect(loadResult.data.sessionHistory).toEqual([]);
        expect(loadResult.data.achievements).toEqual([]);
        expect(loadResult.data.learningStreak.currentStreak).toBe(0);
      }
    });
  });

  describe('restoreFromBackup', () => {
    it('should restore data from backup successfully', () => {
      const originalData = createMockDataStore();
      saveData(originalData);

      // Create backup with a specific path to avoid conflicts
      const specificBackupPath = '/tmp/test-restore-backup.json';
      const backupResult = backupData(specificBackupPath);
      expect(backupResult.success).toBe(true);

      // Clear data (this will create its own backup with a different name)
      clearAllData();

      // Restore from our specific backup
      if (backupResult.success) {
        const restoreResult = restoreFromBackup(backupResult.data);
        expect(restoreResult.success).toBe(true);

        // Verify data was restored
        const loadResult = loadData();
        expect(loadResult.success).toBe(true);
        if (loadResult.success) {
          expect(loadResult.data.cards).toHaveLength(1);
          expect(loadResult.data.cards[0].id).toBe('test-card-1');
        }
      }
    });

    it('should return error for non-existent backup file', () => {
      const restoreResult = restoreFromBackup('/non/existent/backup.json');

      expect(restoreResult.success).toBe(false);
      if (!restoreResult.success) {
        expect(restoreResult.error.message).toBe('Backup file does not exist');
      }
    });
  });
});