import { IValidationService } from '../interfaces/services.js';
import {
  FlashcardSchema,
  CustomStudyFiltersSchema,
  ReviewQualitySchema,
  StudySessionRecordSchema,
  LearningStreakSchema,
  AchievementSchema
} from '../schemas/index.js';
import {
  Flashcard,
  CustomStudyFilters,
  ReviewQuality,
  StudySessionRecord,
  LearningStreak,
  Achievement
} from '../../features/flashcards/domain/index.js';

/**
 * Validation Service Implementation
 * Provides runtime validation using Zod schemas
 */
export class ValidationService implements IValidationService {
  readonly name = 'ValidationService';
  readonly version = '1.0.0';

  /**
   * Validate flashcard data
   */
  validateFlashcard(data: unknown): {
    isValid: boolean;
    data?: Flashcard;
    errors: string[];
  } {
    const result = FlashcardSchema.safeParse(data);
    if (result.success) {
      return { isValid: true, data: result.data as Flashcard, errors: [] };
    }
    return {
      isValid: false,
      errors: result.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`)
    };
  }

  validateSessionData(data: unknown): {
    isValid: boolean;
    data?: Omit<StudySessionRecord, 'id'>;
    errors: string[];
  } {
    const result = StudySessionRecordSchema.omit({ id: true }).safeParse(data);
    if (result.success) {
      return {
        isValid: true,
        data: result.data as Omit<StudySessionRecord, 'id'>,
        errors: []
      };
    }
    return {
      isValid: false,
      errors: result.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`)
    };
  }

  /**
   * Validate custom study filters
   */
  validateCustomStudyFilters(data: unknown): {
    isValid: boolean;
    data?: CustomStudyFilters;
    errors: string[];
  } {
    const result = CustomStudyFiltersSchema.safeParse(data);
    if (result.success) {
      return {
        isValid: true,
        data: result.data as CustomStudyFilters,
        errors: []
      };
    }
    return {
      isValid: false,
      errors: result.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`)
    };
  }

  /**
   * Validate review quality
   */
  validateReviewQuality(data: unknown): {
    isValid: boolean;
    data?: ReviewQuality;
    errors: string[];
  } {
    const result = ReviewQualitySchema.safeParse(data);
    if (result.success) {
      return { isValid: true, data: result.data as ReviewQuality, errors: [] };
    }
    return {
      isValid: false,
      errors: result.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`)
    };
  }

  /**
   * Validate study session record
   */
  validateStudySessionRecord(data: unknown): {
    isValid: boolean;
    data?: StudySessionRecord;
    errors: string[];
  } {
    const result = StudySessionRecordSchema.safeParse(data);
    if (result.success) {
      return {
        isValid: true,
        data: result.data as unknown as StudySessionRecord,
        errors: []
      };
    }
    return {
      isValid: false,
      errors: result.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`)
    };
  }

  /**
   * Validate learning streak data
   */
  validateLearningStreak(data: unknown): {
    isValid: boolean;
    data?: LearningStreak;
    errors: string[];
  } {
    const result = LearningStreakSchema.safeParse(data);
    if (result.success) {
      return {
        isValid: true,
        data: result.data as unknown as LearningStreak,
        errors: []
      };
    }
    return {
      isValid: false,
      errors: result.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`)
    };
  }

  /**
   * Validate achievement data
   */
  validateAchievement(data: unknown): {
    isValid: boolean;
    data?: Achievement;
    errors: string[];
  } {
    const result = AchievementSchema.safeParse(data);
    if (result.success) {
      return { isValid: true, data: result.data as Achievement, errors: [] };
    }
    return {
      isValid: false,
      errors: result.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`)
    };
  }

  /**
   * Validate string inputs (common validation)
   */
  validateString(
    value: unknown,
    minLength: number = 1,
    maxLength: number = 1000
  ): {
    isValid: boolean;
    data?: string;
    errors: string[];
  } {
    if (typeof value !== 'string') {
      return {
        isValid: false,
        errors: ['Value must be a string']
      };
    }

    const errors: string[] = [];

    if (value.length < minLength) {
      errors.push(`String must be at least ${minLength} characters long`);
    }

    if (value.length > maxLength) {
      errors.push(`String must be no more than ${maxLength} characters long`);
    }

    const trimmed = value.trim();
    if (trimmed.length === 0 && minLength > 0) {
      errors.push('String cannot be empty or whitespace only');
    }

    return {
      isValid: errors.length === 0,
      data: errors.length === 0 ? trimmed : undefined,
      errors
    };
  }

  /**
   * Validate array of strings (for tags, etc.)
   */
  validateStringArray(
    value: unknown,
    maxItems: number = 50,
    itemMaxLength: number = 100
  ): {
    isValid: boolean;
    data?: string[];
    errors: string[];
  } {
    if (!Array.isArray(value)) {
      return {
        isValid: false,
        errors: ['Value must be an array']
      };
    }

    const errors: string[] = [];
    const validItems: string[] = [];

    if (value.length > maxItems) {
      errors.push(`Array cannot contain more than ${maxItems} items`);
    }

    for (let i = 0; i < Math.min(value.length, maxItems); i++) {
      const item = value[i];

      if (typeof item !== 'string') {
        errors.push(`Item at index ${i} must be a string`);
        continue;
      }

      if (item.length > itemMaxLength) {
        errors.push(`Item at index ${i} exceeds maximum length of ${itemMaxLength} characters`);
        continue;
      }

      const trimmed = item.trim().toLowerCase();
      if (trimmed.length > 0) {
        validItems.push(trimmed);
      }
    }

    return {
      isValid: errors.length === 0,
      data: errors.length === 0 ? validItems : undefined,
      errors
    };
  }

  /**
   * Validate numeric value within range
   */
  validateNumber(
    value: unknown,
    min: number = -Infinity,
    max: number = Infinity
  ): {
    isValid: boolean;
    data?: number;
    errors: string[];
  } {
    if (typeof value !== 'number' || isNaN(value)) {
      return {
        isValid: false,
        errors: ['Value must be a valid number']
      };
    }

    const errors: string[] = [];

    if (value < min) {
      errors.push(`Number must be at least ${min}`);
    }

    if (value > max) {
      errors.push(`Number must be no more than ${max}`);
    }

    return {
      isValid: errors.length === 0,
      data: errors.length === 0 ? value : undefined,
      errors
    };
  }

  /**
   * Validate date value
   */
  validateDate(value: unknown): {
    isValid: boolean;
    data?: Date;
    errors: string[];
  } {
    if (value instanceof Date) {
      if (isNaN(value.getTime())) {
        return {
          isValid: false,
          errors: ['Invalid date']
        };
      }
      return {
        isValid: true,
        data: value,
        errors: []
      };
    }

    if (typeof value === 'string' || typeof value === 'number') {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        return {
          isValid: false,
          errors: ['Value must be a valid date']
        };
      }
      return {
        isValid: true,
        data: date,
        errors: []
      };
    }

    return {
      isValid: false,
      errors: ['Value must be a date or date string']
    };
  }

  /**
   * Validate card ID format
   */
  validateCardId(value: unknown): {
    isValid: boolean;
    data?: string;
    errors: string[];
  } {
    const stringResult = this.validateString(value, 1, 100);

    if (!stringResult.isValid) {
      return stringResult;
    }

    const id = stringResult.data!;
    const errors: string[] = [];

    // Basic ID format validation (alphanumeric with hyphens and underscores, but no spaces or special chars)
    if (!/^[a-zA-Z0-9](?:[a-zA-Z0-9\-_]*[a-zA-Z0-9])?$/.test(id)) {
      errors.push('ID contains invalid characters or cannot end with special characters');
    }

    return {
      isValid: errors.length === 0,
      data: errors.length === 0 ? id : undefined,
      errors
    };
  }

  /**
   * Batch validation for multiple items
   */
  validateBatch<T>(
    items: unknown[],
    validator: (item: unknown) => {
      isValid: boolean;
      data?: T;
      errors: string[];
    }
  ): {
    isValid: boolean;
    data?: T[];
    errors: string[];
  } {
    const allData: T[] = [];
    const allErrors: string[] = [];

    for (let i = 0; i < items.length; i++) {
      const result = validator(items[i]);

      if (result.isValid && result.data) {
        allData.push(result.data);
      } else {
        allErrors.push(...result.errors.map(error => `Item ${i}: ${error}`));
      }
    }

    return {
      isValid: allErrors.length === 0,
      data: allErrors.length === 0 ? allData : undefined,
      errors: allErrors
    };
  }
}
