import { Result, Ok, Err } from '../utils/result-type.js';
import { safeValidateDataStore } from '../schemas/index.js';
import { ValidatedDataStore } from '../schemas/session.schema.js';
import { toDateString } from '../utils/date-utils.js';

/**
 * Pure functions for JSON parsing and serialization
 * Handles date revival and validation
 */

/**
 * Safe JSON parsing with automatic date revival and validation
 */
export const parseJsonWithDateRevival = (jsonString: string): Result<ValidatedDataStore, Error> => {
  try {
    // First, parse the JSON
    const parsed = JSON.parse(jsonString);

    // Validate basic structure
    if (!parsed || typeof parsed !== 'object') {
      return Err(new Error('Invalid data structure: must be an object'));
    }

    // Revive dates and transform data
    const revived = {
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
        endTime: session.endTime ? new Date(session.endTime) : null
      })),
      learningStreak: {
        currentStreak: parsed.learningStreak?.currentStreak || 0,
        longestStreak: parsed.learningStreak?.longestStreak || 0,
        lastStudyDate: parsed.learningStreak?.lastStudyDate
          ? new Date(parsed.learningStreak.lastStudyDate)
          : null,
        studyDates: parsed.learningStreak?.studyDates || []
      },
      achievements: (parsed.achievements || []).map((achievement: any) => ({
        ...achievement,
        unlockedAt: achievement.unlockedAt ? new Date(achievement.unlockedAt) : null
      }))
    };

    // Validate with Zod schema
    return safeValidateDataStore(revived);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return Err(new Error('Invalid JSON format'));
    }
    return Err(error instanceof Error ? error : new Error('Failed to parse JSON'));
  }
};

/**
 * Serialize data to JSON string
 */
export const serializeToJson = (data: ValidatedDataStore): Result<string, Error> => {
  try {
    const jsonString = JSON.stringify(data, null, 2);
    return Ok(jsonString);
  } catch (error) {
    return Err(error instanceof Error ? error : new Error('Failed to serialize data to JSON'));
  }
};

/**
 * Parse JSON with optional schema validation
 */
export const parseJson = <T>(
  jsonString: string,
  validator?: (data: unknown) => T
): Result<T, Error> => {
  try {
    const parsed = JSON.parse(jsonString);

    if (validator) {
      try {
        const validated = validator(parsed);
        return Ok(validated);
      } catch (validationError) {
        return Err(
          validationError instanceof Error ? validationError : new Error('Validation failed')
        );
      }
    }

    return Ok(parsed as T);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return Err(new Error('Invalid JSON format'));
    }
    return Err(error instanceof Error ? error : new Error('Failed to parse JSON'));
  }
};

/**
 * Check if JSON is valid format
 */
export const isValidJson = (jsonString: string): boolean => {
  try {
    JSON.parse(jsonString);
    return true;
  } catch {
    return false;
  }
};

/**
 * Format date for backup filenames
 */
export const formatBackupTimestamp = (date: Date): string => {
  return date.toISOString().replace(/[:.]/g, '-');
};

/**
 * Generate backup filename
 */
export const generateBackupFilename = (originalPath: string, date: Date = new Date()): string => {
  const timestamp = formatBackupTimestamp(date);
  return originalPath.replace('.json', `.backup.${timestamp}.json`);
};
