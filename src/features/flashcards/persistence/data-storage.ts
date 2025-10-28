import {
  Flashcard,
  StudySessionRecord,
  LearningStreak,
  Achievement
} from '../../../shared/types/index.js';
import { Result, Ok, Err } from '../../../shared/utils/result-type.js';
import { toDateString } from '../../../shared/utils/date-utils.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, '../../../..', 'flashcards.json');

/**
 * Data storage interface for persisting application state
 */
export interface DataStore {
  cards: Flashcard[];
  sessionHistory: StudySessionRecord[];
  learningStreak: LearningStreak;
  achievements: Achievement[];
}

/**
 * Safe JSON parsing with date revival
 */
const safeJsonParse = (data: string): Result<DataStore> => {
  try {
    const parsed = JSON.parse(data);

    // Validate structure
    if (!parsed || typeof parsed !== 'object') {
      return Err(new Error('Invalid data structure'));
    }

    // Revive dates and validate data
    const revived: DataStore = {
      cards: (parsed.cards || []).map((card: any) => ({
        ...card,
        nextReview: new Date(card.nextReview),
        lastReview: card.lastReview ? new Date(card.lastReview) : null,
        createdAt: new Date(card.createdAt),
        tags: card.tags || [] // Backward compatibility
      })),
      sessionHistory: (parsed.sessionHistory || []).map((session: any) => ({
        ...session,
        startTime: new Date(session.startTime),
        endTime: session.endTime ? new Date(session.endTime) : undefined
      })),
      learningStreak: {
        currentStreak: 0,
        longestStreak: 0,
        studyDates: [],
        ...parsed.learningStreak,
        lastStudyDate: parsed.learningStreak?.lastStudyDate
          ? new Date(parsed.learningStreak.lastStudyDate)
          : null
      },
      achievements: (parsed.achievements || []).map((ach: any) => ({
        ...ach,
        unlockedAt: ach.unlockedAt ? new Date(ach.unlockedAt) : undefined
      }))
    };

    return Ok(revived);
  } catch (error) {
    return Err(error instanceof Error ? error : new Error('Failed to parse data'));
  }
};

/**
 * Load data from storage file
 */
export const loadData = (): Result<DataStore> => {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return Ok({
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
    }

    const fileContent = fs.readFileSync(DATA_FILE, 'utf-8');
    return safeJsonParse(fileContent);
  } catch (error) {
    return Err(error instanceof Error ? error : new Error('Failed to load data'));
  }
};

/**
 * Save data to storage file
 */
export const saveData = (data: DataStore): Result<void> => {
  try {
    // Create directory if it doesn't exist
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const jsonContent = JSON.stringify(data, null, 2);
    fs.writeFileSync(DATA_FILE, jsonContent, 'utf-8');
    return Ok(undefined);
  } catch (error) {
    return Err(error instanceof Error ? error : new Error('Failed to save data'));
  }
};

/**
 * Update data atomically (read-modify-write)
 */
export const updateData = (updater: (data: DataStore) => DataStore): Result<void> => {
  const loadResult = loadData();
  if (!loadResult.success) {
    return loadResult;
  }

  const updatedData = updater(loadResult.data);
  return saveData(updatedData);
};

/**
 * Backup current data file
 */
export const backupData = (backupPath?: string): Result<string> => {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return Err(new Error('No data file to backup'));
    }

    // Use full timestamp to avoid conflicts when multiple backups are created on the same day
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const defaultBackupPath = DATA_FILE.replace('.json', `.backup.${timestamp}.json`);
    const finalBackupPath = backupPath || defaultBackupPath;

    fs.copyFileSync(DATA_FILE, finalBackupPath);
    return Ok(finalBackupPath);
  } catch (error) {
    return Err(error instanceof Error ? error : new Error('Failed to backup data'));
  }
};

/**
 * Restore data from backup
 */
export const restoreFromBackup = (backupPath: string): Result<void> => {
  try {
    if (!fs.existsSync(backupPath)) {
      return Err(new Error('Backup file does not exist'));
    }

    // Verify backup file integrity
    const backupContent = fs.readFileSync(backupPath, 'utf-8');
    const parseResult = safeJsonParse(backupContent);
    if (!parseResult.success) {
      return Err(new Error('Invalid backup file format'));
    }

    // Create backup of current data before restoring
    const currentBackupResult = backupData();
    if (currentBackupResult.success) {
      console.log(`Created backup of current data: ${currentBackupResult.data}`);
    }

    // Restore from backup
    fs.copyFileSync(backupPath, DATA_FILE);
    return Ok(undefined);
  } catch (error) {
    return Err(error instanceof Error ? error : new Error('Failed to restore backup'));
  }
};

/**
 * Get data file statistics
 */
export const getDataStats = (): Result<{
  fileSize: number;
  lastModified: Date;
  cardCount: number;
  sessionCount: number;
  achievementCount: number;
}> => {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return Ok({
        fileSize: 0,
        lastModified: new Date(),
        cardCount: 0,
        sessionCount: 0,
        achievementCount: 0
      });
    }

    const stats = fs.statSync(DATA_FILE);
    const dataResult = loadData();

    if (!dataResult.success) {
      return dataResult;
    }

    return Ok({
      fileSize: stats.size,
      lastModified: stats.mtime,
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
export const validateDataIntegrity = (): Result<{
  isValid: boolean;
  issues: string[];
}> => {
  try {
    const dataResult = loadData();
    if (!dataResult.success) {
      return Ok({
        isValid: false,
        issues: [dataResult.error.message]
      });
    }

    const issues: string[] = [];
    const { cards, sessionHistory, achievements } = dataResult.data;

    // Validate cards
    cards.forEach((card, index) => {
      if (!card.id || typeof card.id !== 'string') {
        issues.push(`Card ${index}: Missing or invalid ID`);
      }
      if (!card.front || typeof card.front !== 'string') {
        issues.push(`Card ${index}: Missing or invalid front text`);
      }
      if (!card.back || typeof card.back !== 'string') {
        issues.push(`Card ${index}: Missing or invalid back text`);
      }
      if (!(card.nextReview instanceof Date) || isNaN(card.nextReview.getTime())) {
        issues.push(`Card ${index}: Invalid nextReview date`);
      }
      if (card.easiness < 1.3 || card.easiness > 3.0) {
        issues.push(`Card ${index}: Easiness factor out of range`);
      }
    });

    // Check for duplicate card IDs
    const cardIds = cards.map(card => card.id);
    const duplicateIds = cardIds.filter((id, index) => cardIds.indexOf(id) !== index);
    if (duplicateIds.length > 0) {
      issues.push(`Duplicate card IDs: ${duplicateIds.join(', ')}`);
    }

    // Validate session history
    sessionHistory.forEach((session, index) => {
      if (!(session.startTime instanceof Date) || isNaN(session.startTime.getTime())) {
        issues.push(`Session ${index}: Invalid startTime`);
      }
      if (session.endTime && !(session.endTime instanceof Date)) {
        issues.push(`Session ${index}: Invalid endTime`);
      }
      if (session.cardsStudied < 0) {
        issues.push(`Session ${index}: Invalid cardsStudied count`);
      }
    });

    // Validate achievements
    achievements.forEach((achievement, index) => {
      if (!achievement.id || typeof achievement.id !== 'string') {
        issues.push(`Achievement ${index}: Missing or invalid ID`);
      }
      if (achievement.progress.current < 0 || achievement.progress.required < 0) {
        issues.push(`Achievement ${index}: Invalid progress values`);
      }
    });

    return Ok({
      isValid: issues.length === 0,
      issues
    });
  } catch (error) {
    return Err(error instanceof Error ? error : new Error('Failed to validate data'));
  }
};

/**
 * Clear all data (for testing or reset purposes)
 */
export const clearAllData = (): Result<void> => {
  try {
    // Create backup before clearing
    const backupResult = backupData();
    if (backupResult.success) {
      console.log(`Created backup before clearing: ${backupResult.data}`);
    }

    const emptyData: DataStore = {
      cards: [],
      sessionHistory: [],
      learningStreak: {
        currentStreak: 0,
        longestStreak: 0,
        lastStudyDate: null,
        studyDates: []
      },
      achievements: []
    };

    return saveData(emptyData);
  } catch (error) {
    return Err(error instanceof Error ? error : new Error('Failed to clear data'));
  }
};
