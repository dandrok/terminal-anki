import { z } from 'zod';

/**
 * Zod schemas for runtime validation of flashcard-related data
 */

/**
 * Core flashcard schema with comprehensive validation
 */
export const FlashcardSchema = z.object({
  id: z.string().min(1, 'Flashcard ID cannot be empty').max(100, 'Flashcard ID too long'),
  front: z
    .string()
    .min(1, 'Front text cannot be empty')
    .max(1000, 'Front text too long (max 1000 characters)')
    .trim(),
  back: z
    .string()
    .min(1, 'Back text cannot be empty')
    .max(2000, 'Back text too long (max 2000 characters)')
    .trim(),
  tags: z
    .array(z.string().min(1, 'Tag cannot be empty').max(50, 'Tag too long').trim().toLowerCase())
    .max(20, 'Too many tags (max 20)')
    .default([]),
  easiness: z
    .number()
    .min(1.3, 'Easiness factor too low (min 1.3)')
    .max(3.0, 'Easiness factor too high (max 3.0)')
    .default(2.5),
  interval: z
    .number()
    .int('Interval must be integer')
    .min(1, 'Interval must be at least 1 day')
    .default(1),
  repetitions: z
    .number()
    .int('Repetitions must be integer')
    .min(0, 'Repetitions cannot be negative')
    .default(0),
  nextReview: z.coerce.date(),
  lastReview: z.coerce.date().nullable(),
  createdAt: z.coerce.date()
});

/**
 * Schema for creating new flashcards
 */
export const FlashcardCreateSchema = z.object({
  front: z.string().min(1, 'Front text cannot be empty').max(1000, 'Front text too long').trim(),
  back: z.string().min(1, 'Back text cannot be empty').max(2000, 'Back text too long').trim(),
  tags: z
    .array(z.string().min(1, 'Tag cannot be empty').max(50, 'Tag too long').trim().toLowerCase())
    .max(20, 'Too many tags')
    .default([])
});

/**
 * Schema for updating existing flashcards
 */
export const FlashcardUpdateSchema = z.object({
  front: z
    .string()
    .min(1, 'Front text cannot be empty')
    .max(1000, 'Front text too long')
    .trim()
    .optional(),
  back: z
    .string()
    .min(1, 'Back text cannot be empty')
    .max(2000, 'Back text too long')
    .trim()
    .optional(),
  tags: z
    .array(z.string().min(1, 'Tag cannot be empty').max(50, 'Tag too long').trim().toLowerCase())
    .max(20, 'Too many tags')
    .optional()
});

/**
 * Schema for flashcard search filters
 */
export const FlashcardSearchFiltersSchema = z.object({
  query: z.string().trim().optional(),
  tags: z.array(z.string().trim().toLowerCase()).optional(),
  difficulty: z.enum(['new', 'learning', 'young', 'mature']).optional(),
  includeDue: z.boolean().optional()
});

/**
 * Card ID validation
 */
export const CardIdSchema = z
  .string()
  .min(1, 'Card ID cannot be empty')
  .max(100, 'Card ID too long');

/**
 * Tag name validation
 */
export const TagNameSchema = z
  .string()
  .min(1, 'Tag name cannot be empty')
  .max(50, 'Tag name too long')
  .trim()
  .toLowerCase();

/**
 * Review quality validation (SM-2 algorithm)
 */
export const ReviewQualitySchema = z
  .number()
  .int('Review quality must be integer')
  .min(0, 'Review quality minimum is 0')
  .max(5, 'Review quality maximum is 5');

/**
 * Extracted types for better type safety
 */
export type ValidatedFlashcard = z.infer<typeof FlashcardSchema>;
export type ValidatedFlashcardCreate = z.infer<typeof FlashcardCreateSchema>;
export type ValidatedFlashcardUpdate = z.infer<typeof FlashcardUpdateSchema>;
export type ValidatedFlashcardSearchFilters = z.infer<typeof FlashcardSearchFiltersSchema>;
export type ValidatedCardId = z.infer<typeof CardIdSchema>;
export type ValidatedTagName = z.infer<typeof TagNameSchema>;
export type ValidatedReviewQuality = z.infer<typeof ReviewQualitySchema>;

/**
 * Validation utilities
 */
export const validateFlashcard = (data: unknown): ValidatedFlashcard => {
  return FlashcardSchema.parse(data);
};

export const validateFlashcardCreate = (data: unknown): ValidatedFlashcardCreate => {
  return FlashcardCreateSchema.parse(data);
};

export const validateFlashcardUpdate = (data: unknown): ValidatedFlashcardUpdate => {
  return FlashcardUpdateSchema.parse(data);
};

export const validateCardId = (id: unknown): ValidatedCardId => {
  return CardIdSchema.parse(id);
};

export const validateTagName = (tag: unknown): ValidatedTagName => {
  return TagNameSchema.parse(tag);
};

export const validateReviewQuality = (quality: unknown): ValidatedReviewQuality => {
  return ReviewQualitySchema.parse(quality);
};

/**
 * Safe validation functions that return Result types
 */
export const safeValidateFlashcard = (data: unknown) => {
  try {
    const result = FlashcardSchema.parse(data);
    return { success: true, data: result } as const;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Validation failed')
    } as const;
  }
};

export const safeValidateFlashcardCreate = (data: unknown) => {
  try {
    const result = FlashcardCreateSchema.parse(data);
    return { success: true, data: result } as const;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Validation failed')
    } as const;
  }
};

export const safeValidateCardId = (id: unknown) => {
  try {
    const result = CardIdSchema.parse(id);
    return { success: true, data: result } as const;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Invalid card ID')
    } as const;
  }
};
