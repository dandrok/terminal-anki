import { z } from 'zod';
import { Result } from './result-type.js';

/**
 * Type-safe input validation using Zod schemas
 */
export const createValidator = <T>(schema: z.ZodSchema<T>) => {
  return (input: unknown): Result<T, z.ZodError> => {
    const result = schema.safeParse(input);

    if (result.success) {
      return { success: true, data: result.data };
    }

    return { success: false, error: result.error };
  };
};

/**
 * Common validation schemas
 */
export const schemas = {
  // Flashcard validation
  flashcardFront: z.string().min(1, 'Front text is required').max(200, 'Front text too long'),
  flashcardBack: z.string().min(1, 'Back text is required').max(500, 'Back text too long'),
  flashcardTag: z.string().min(1, 'Tag cannot be empty').max(50, 'Tag too long'),
  flashcardId: z.string().uuid('Invalid flashcard ID'),

  // Session validation
  studySessionLength: z
    .number()
    .int()
    .min(1, 'Session must have at least 1 card')
    .max(100, 'Session too large'),
  reviewQuality: z.number().int().min(0, 'Quality must be 0-5').max(5, 'Quality must be 0-5'),

  // UI validation
  searchQuery: z.string().min(1, 'Search query required').max(100, 'Search query too long'),

  // Date validation
  date: z.date(),
  optionalDate: z.date().optional()
} as const;

/**
 * Type guards using Zod schemas
 */
export const isValidFlashcardFront = createValidator(schemas.flashcardFront);
export const isValidFlashcardBack = createValidator(schemas.flashcardBack);
export const isValidFlashcardTag = createValidator(schemas.flashcardTag);
export const isValidFlashcardId = createValidator(schemas.flashcardId);
export const isValidStudySessionLength = createValidator(schemas.studySessionLength);
export const isValidReviewQuality = createValidator(schemas.reviewQuality);
export const isValidSearchQuery = createValidator(schemas.searchQuery);

/**
 * Array validation
 */
export const validateTagArray = (tags: unknown[]): Result<string[], z.ZodError> => {
  const schema = z.array(schemas.flashcardTag).min(0).max(10, 'Too many tags (max 10)');
  return createValidator(schema)(tags);
};

export const validateCardCreationData = createValidator(
  z.object({
    front: schemas.flashcardFront,
    back: schemas.flashcardBack,
    tags: z.array(schemas.flashcardTag).optional()
  })
);
