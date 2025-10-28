import { Result, Ok, Err } from '../../../shared/utils/result-type.js';
import { ValidatedDataStore, safeValidateDataStore } from '../../../shared/schemas/index.js';
import {
  readFileContent,
  writeFileContent,
  getFileStats
} from '../../../shared/infrastructure/index.js';
import {
  parseJsonWithDateRevival,
  serializeToJson
} from '../../../shared/infrastructure/json-operations.js';
import { createBackup, restoreFromBackup as restoreFromBackupFile } from '../../../shared/infrastructure/backup-manager.js';
import { validateDataIntegrity } from '../../../shared/infrastructure/data-validation.js';
import path from 'path';
import { fileURLToPath } from 'url';

// Configuration
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, '../../../..', 'flashcards.json');

/**
 * Data storage interface for persisting application state
 */
export interface DataStore {
  cards: any[];
  sessionHistory: any[];
  learningStreak: any;
  achievements: any[];
}

/**
 * Pure data loading function with comprehensive error handling
 */
export const loadData = (): Result<ValidatedDataStore, Error> => {
  try {
    const fileResult = readFileContent(DATA_FILE);
    if (!fileResult.success) {
      // If file doesn't exist, return empty data store
      if (fileResult.error.message.includes('not found')) {
        const emptyDataStoreResult = safeValidateDataStore({
          cards: [],
          sessionHistory: [],
          learningStreak: {
            currentStreak: 0,
            longestStreak: 0,
            lastStudyDate: null,
            studyDates: []
          },
          achievements: []
        });
        if (!emptyDataStoreResult.success) {
          return Err(new Error('Failed to create empty data store'));
        }
        return Ok(emptyDataStoreResult.data);
      }
      return fileResult;
    }

    const parseResult = parseJsonWithDateRevival(fileResult.data);
    if (!parseResult.success) {
      return parseResult;
    }
    return Ok(parseResult.data);
  } catch (error) {
    return Err(error instanceof Error ? error : new Error('Failed to load data'));
  }
};

/**
 * Pure data saving function with atomic operations
 */
export const saveData = (data: ValidatedDataStore): Result<void, Error> => {
  try {
    // Validate data integrity before saving
    const integrityResult = validateDataIntegrity(data);
    if (!integrityResult.isValid) {
      const errorMessages = integrityResult.errors.map(e => e.message).join(', ');
      return Err(new Error(`Data integrity validation failed: ${errorMessages}`));
    }

    // Serialize to JSON
    const serializeResult = serializeToJson(data);
    if (!serializeResult.success) {
      return serializeResult;
    }

    // Write to file
    return writeFileContent(DATA_FILE, serializeResult.data);
  } catch (error) {
    return Err(error instanceof Error ? error : new Error('Failed to save data'));
  }
};

/**
 * Atomic data update function (read-modify-write)
 */
export const updateData = (
  updater: (data: ValidatedDataStore) => ValidatedDataStore
): Result<void, Error> => {
  const loadResult = loadData();
  if (!loadResult.success) {
    return loadResult;
  }

  const updatedData = updater(loadResult.data);
  return saveData(updatedData);
};

/**
 * Create backup with custom path or auto-generated timestamp
 */
export const backupData = (backupPath?: string): Result<string, Error> => {
  return createBackup(DATA_FILE, backupPath);
};

/**
 * Restore data from backup file
 */
export const restoreFromLocalBackup = (backupPath: string): Result<void, Error> => {
  // Validate backup file integrity
  const backupContentResult = readFileContent(backupPath);
  if (!backupContentResult.success) {
    return Err(new Error('Failed to read backup file'));
  }

  const parseResult = parseJsonWithDateRevival(backupContentResult.data);
  if (!parseResult.success) {
    return Err(new Error('Invalid backup file format'));
  }

  // Create backup of current data before restoring
  const currentBackupResult = backupData();
  if (currentBackupResult.success) {
    console.log(`Created backup of current data: ${currentBackupResult.data}`);
  }

  // Restore from backup
  return restoreFromBackupFile(backupPath, DATA_FILE);
};

/**
 * Get data file statistics
 */
export const getDataStats = (): Result<
  {
    fileSize: number;
    lastModified: Date;
    cardCount: number;
    sessionCount: number;
    achievementCount: number;
  },
  Error
> => {
  try {
    const statsResult = getFileStats(DATA_FILE);
    if (!statsResult.success) {
      return Err(new Error('Data file not found'));
    }

    const dataResult = loadData();
    if (!dataResult.success) {
      return Err(new Error('Failed to load data for stats'));
    }

    return Ok({
      fileSize: statsResult.data.size,
      lastModified: statsResult.data.mtime,
      cardCount: dataResult.data.cards.length,
      sessionCount: dataResult.data.sessionHistory.length,
      achievementCount: dataResult.data.achievements.length
    });
  } catch (error) {
    return Err(error instanceof Error ? error : new Error('Failed to get data stats'));
  }
};

/**
 * Validate data integrity
 */
export const validateData = (): Result<
  {
    isValid: boolean;
    issues: string[];
  },
  Error
> => {
  try {
    const dataResult = loadData();
    if (!dataResult.success) {
      return Err(new Error('Failed to load data for validation'));
    }

    const integrityResult = validateDataIntegrity(dataResult.data);

    return Ok({
      isValid: integrityResult.isValid,
      issues: integrityResult.issues.map(issue => issue.message)
    });
  } catch (error) {
    return Err(error instanceof Error ? error : new Error('Failed to validate data'));
  }
};

/**
 * Clear all data (for testing or reset purposes)
 */
export const clearAllData = (): Result<void, Error> => {
  try {
    // Create backup before clearing
    const backupResult = backupData();
    if (backupResult.success) {
      console.log(`Created backup before clearing: ${backupResult.data}`);
    }

    const emptyDataStoreResult = safeValidateDataStore({
      cards: [],
      sessionHistory: [],
      learningStreak: {
        currentStreak: 0,
        longestStreak: 0,
        lastStudyDate: null,
        studyDates: []
      },
      achievements: []
    });

    if (!emptyDataStoreResult.success) {
      return Err(new Error('Failed to validate empty data store'));
    }

    return saveData(emptyDataStoreResult.data);
  } catch (error) {
    return Err(error instanceof Error ? error : new Error('Failed to clear data'));
  }
};

/**
 * Export data to JSON string
 */
export const exportData = (): Result<string, Error> => {
  const dataResult = loadData();
  if (!dataResult.success) {
    return Err(new Error('Failed to load data for export'));
  }

  return serializeToJson(dataResult.data);
};

/**
 * Import data from JSON string
 */
export const importData = (jsonString: string): Result<void, Error> => {
  const parseResult = parseJsonWithDateRevival(jsonString);
  if (!parseResult.success) {
    return Err(new Error('Invalid import data format'));
  }

  // Validate imported data
  const integrityResult = validateDataIntegrity(parseResult.data);
  if (!integrityResult.isValid) {
    const errorMessages = integrityResult.errors.map(e => e.message).join(', ');
    return Err(new Error(`Import data validation failed: ${errorMessages}`));
  }

  return saveData(parseResult.data);
};
