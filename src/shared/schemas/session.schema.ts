import { z } from 'zod';
import { FlashcardSchema } from './flashcard.schema';

/**
 * Zod schemas for session-related data validation
 */

/**
 * Study session record schema
 */
export const StudySessionRecordSchema = z.object({
  id: z.string().min(1, 'Session ID cannot be empty'),
  startTime: z.coerce.date(),
  endTime: z.coerce.date().nullable(),
  cardsStudied: z
    .number()
    .int('Cards studied must be integer')
    .min(0, 'Cards studied cannot be negative'),
  correctAnswers: z
    .number()
    .int('Correct answers must be integer')
    .min(0, 'Correct answers cannot be negative'),
  incorrectAnswers: z
    .number()
    .int('Incorrect answers must be integer')
    .min(0, 'Incorrect answers cannot be negative'),
  averageDifficulty: z
    .number()
    .min(0, 'Average difficulty cannot be negative')
    .max(5, 'Average difficulty cannot exceed 5'),
  sessionType: z.enum(['due', 'custom', 'new', 'review']),
  quitEarly: z.boolean().default(false),
  customStudyFilters: z
    .object({
      tags: z.array(z.string()).optional(),
      difficulty: z.enum(['new', 'learning', 'young', 'mature']).optional(),
      limit: z.number().int().positive().optional(),
      randomOrder: z.boolean().optional()
    })
    .optional()
});

/**
 * Learning streak schema
 */
export const LearningStreakSchema = z.object({
  currentStreak: z
    .number()
    .int('Current streak must be integer')
    .min(0, 'Current streak cannot be negative'),
  longestStreak: z
    .number()
    .int('Longest streak must be integer')
    .min(0, 'Longest streak cannot be negative'),
  lastStudyDate: z.coerce.date().nullable(),
  studyDates: z.array(z.string()).default([])
});

/**
 * Achievement schema
 */
export const AchievementSchema = z.object({
  id: z.string().min(1, 'Achievement ID cannot be empty'),
  name: z.string().min(1, 'Achievement name cannot be empty'),
  description: z.string().min(1, 'Achievement description cannot be empty'),
  icon: z.string().min(1, 'Achievement icon cannot be empty'),
  category: z.enum(['cards', 'sessions', 'streaks', 'mastery']),
  progress: z.object({
    current: z.number().int().min(0),
    required: z.number().int().positive(),
    description: z.string()
  }),
  unlockedAt: z.coerce.date().nullable(),
  unlockedBy: z.string().optional()
});

/**
 * Custom study filters schema
 */
export const CustomStudyFiltersSchema = z.object({
  query: z.string().trim().optional(),
  tags: z.array(z.string().trim().toLowerCase()).default([]),
  difficulty: z.enum(['new', 'learning', 'young', 'mature']).optional(),
  includeDue: z.boolean().optional(),
  limit: z.number().int('Limit must be integer').positive('Limit must be positive').optional(),
  randomOrder: z.boolean().default(false)
});

/**
 * Data store schema for complete application state
 */
export const DataStoreSchema = z.object({
  cards: z.array(FlashcardSchema).default([]),
  sessionHistory: z.array(StudySessionRecordSchema).default([]),
  learningStreak: LearningStreakSchema,
  achievements: z.array(AchievementSchema).default([])
});

/**
 * Extracted types
 */
export type ValidatedStudySessionRecord = z.infer<typeof StudySessionRecordSchema>;
export type ValidatedLearningStreak = z.infer<typeof LearningStreakSchema>;
export type ValidatedAchievement = z.infer<typeof AchievementSchema>;
export type ValidatedCustomStudyFilters = z.infer<typeof CustomStudyFiltersSchema>;
export type ValidatedDataStore = z.infer<typeof DataStoreSchema>;

/**
 * Validation utilities
 */
export const validateStudySessionRecord = (data: unknown): ValidatedStudySessionRecord => {
  return StudySessionRecordSchema.parse(data);
};

export const validateLearningStreak = (data: unknown): ValidatedLearningStreak => {
  return LearningStreakSchema.parse(data);
};

export const validateAchievement = (data: unknown): ValidatedAchievement => {
  return AchievementSchema.parse(data);
};

export const validateCustomStudyFilters = (data: unknown): ValidatedCustomStudyFilters => {
  return CustomStudyFiltersSchema.parse(data);
};

export const validateDataStore = (data: unknown): ValidatedDataStore => {
  return DataStoreSchema.parse(data);
};

/**
 * Safe validation functions
 */
export const safeValidateDataStore = (data: unknown) => {
  try {
    const result = DataStoreSchema.parse(data);
    return { success: true, data: result } as const;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Data validation failed')
    } as const;
  }
};

export const safeValidateStudySessionRecord = (data: unknown) => {
  try {
    const result = StudySessionRecordSchema.parse(data);
    return { success: true, data: result } as const;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Session validation failed')
    } as const;
  }
};
