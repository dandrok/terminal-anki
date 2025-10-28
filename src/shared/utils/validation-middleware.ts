import { IValidationService } from '../interfaces/services.js';
import { Result, Ok, Err } from './result-type.js';

/**
 * Validation middleware and guards
 * Provides reusable validation logic for service methods
 */

export type ValidationResult<T = any> = {
  isValid: boolean;
  data?: T;
  errors: string[];
};

/**
 * Create a validation guard for function parameters
 */
export function createValidationGuard<T>(
  validator: (data: unknown) => ValidationResult<T>,
  errorPrefix: string = 'Validation failed'
) {
  return function (data: unknown): Result<T, Error> {
    const result = validator(data);

    if (!result.isValid) {
      const errorMessage = `${errorPrefix}: ${result.errors.join(', ')}`;
      return Err(new Error(errorMessage));
    }

    return Ok(result.data!);
  };
}

/**
 * Validate multiple parameters and return combined result
 */
export function validateMultiple(
  validationService: IValidationService,
  validations: Array<{
    name: string;
    value: unknown;
    validator: (value: unknown) => ValidationResult;
  }>
): Result<Record<string, any>, Error> {
  const errors: string[] = [];
  const validatedData: Record<string, any> = {};

  for (const validation of validations) {
    const result = validation.validator(validation.value);

    if (!result.isValid) {
      errors.push(`${validation.name}: ${result.errors.join(', ')}`);
    } else if (result.data !== undefined) {
      validatedData[validation.name] = result.data;
    }
  }

  if (errors.length > 0) {
    return Err(new Error(`Validation failed: ${errors.join('; ')}`));
  }

  return Ok(validatedData);
}

/**
 * Higher-order function to add validation to a method
 */
export function withValidation<TArgs extends any[], TReturn>(
  validator: (args: TArgs) => Result<any, Error>,
  fn: (...args: TArgs) => TReturn
) {
  return function (...args: TArgs): TReturn | Result<never, Error> {
    const validationResult = validator(args);

    if (!validationResult.success) {
      return validationResult as any; // Return the error result
    }

    return fn(...args);
  };
}

/**
 * Async validation wrapper
 */
export async function withAsyncValidation<TArgs extends any[], TReturn>(
  validator: (args: TArgs) => Promise<Result<any, Error>>,
  fn: (...args: TArgs) => Promise<TReturn>
): Promise<TReturn | Result<never, Error>> {
  try {
    const validationResult = await validator(arguments as any as TArgs);

    if (!validationResult.success) {
      return validationResult as any;
    }

    return await fn(...(arguments as any as TArgs));
  } catch (error) {
    return Err(error instanceof Error ? error : new Error('Unknown error'));
  }
}

/**
 * Common validation combinations
 */
export class CommonValidators {
  constructor(private validationService: IValidationService) {}

  /**
   * Validate flashcard creation parameters
   */
  validateFlashcardCreation(front: unknown, back: unknown, tags: unknown = []) {
    return validateMultiple(this.validationService, [
      {
        name: 'front',
        value: front,
        validator: value => this.validationService.validateString(value, 1, 1000)
      },
      {
        name: 'back',
        value: back,
        validator: value => this.validationService.validateString(value, 1, 2000)
      },
      {
        name: 'tags',
        value: tags,
        validator: value => this.validationService.validateStringArray(value, 20, 50)
      }
    ]);
  }

  /**
   * Validate card ID and review quality
   */
  validateCardReview(cardId: unknown, quality: unknown) {
    return validateMultiple(this.validationService, [
      {
        name: 'cardId',
        value: cardId,
        validator: value => this.validationService.validateCardId(value)
      },
      {
        name: 'quality',
        value: quality,
        validator: value => this.validationService.validateReviewQuality(value)
      }
    ]);
  }

  /**
   * Validate card update parameters
   */
  validateCardUpdate(cardId: unknown, updates: unknown) {
    return validateMultiple(this.validationService, [
      {
        name: 'cardId',
        value: cardId,
        validator: value => this.validationService.validateCardId(value)
      },
      {
        name: 'updates',
        value: updates,
        validator: value => {
          if (typeof value !== 'object' || value === null) {
            return {
              isValid: false,
              errors: ['Updates must be an object']
            };
          }

          const updateObj = value as Record<string, unknown>;
          const errors: string[] = [];

          // Validate front if provided
          if ('front' in updateObj) {
            const frontResult = this.validationService.validateString(updateObj.front, 1, 1000);
            if (!frontResult.isValid) {
              errors.push(`front: ${frontResult.errors.join(', ')}`);
            }
          }

          // Validate back if provided
          if ('back' in updateObj) {
            const backResult = this.validationService.validateString(updateObj.back, 1, 2000);
            if (!backResult.isValid) {
              errors.push(`back: ${backResult.errors.join(', ')}`);
            }
          }

          // Validate tags if provided
          if ('tags' in updateObj) {
            const tagsResult = this.validationService.validateStringArray(updateObj.tags, 20, 50);
            if (!tagsResult.isValid) {
              errors.push(`tags: ${tagsResult.errors.join(', ')}`);
            }
          }

          // Validate easiness if provided
          if ('easiness' in updateObj) {
            const easinessResult = this.validationService.validateNumber(
              updateObj.easiness,
              1.3,
              3.0
            );
            if (!easinessResult.isValid) {
              errors.push(`easiness: ${easinessResult.errors.join(', ')}`);
            }
          }

          // Validate interval if provided
          if ('interval' in updateObj) {
            const intervalResult = this.validationService.validateNumber(
              updateObj.interval,
              1,
              Infinity
            );
            if (!intervalResult.isValid) {
              errors.push(`interval: ${intervalResult.errors.join(', ')}`);
            }
          }

          // Validate repetitions if provided
          if ('repetitions' in updateObj) {
            const repetitionsResult = this.validationService.validateNumber(
              updateObj.repetitions,
              0,
              Infinity
            );
            if (!repetitionsResult.isValid) {
              errors.push(`repetitions: ${repetitionsResult.errors.join(', ')}`);
            }
          }

          return {
            isValid: errors.length === 0,
            data: errors.length === 0 ? updateObj : undefined,
            errors
          };
        }
      }
    ]);
  }

  /**
   * Validate search query
   */
  validateSearchQuery(query: unknown) {
    return validateMultiple(this.validationService, [
      {
        name: 'query',
        value: query,
        validator: value => this.validationService.validateString(value, 1, 100)
      }
    ]);
  }

  /**
   * Validate custom study filters
   */
  validateCustomStudyFilters(filters: unknown) {
    return validateMultiple(this.validationService, [
      {
        name: 'filters',
        value: filters,
        validator: value => this.validationService.validateCustomStudyFilters(value)
      }
    ]);
  }

  /**
   * Validate study session creation
   */
  validateStudySessionCreation(sessionData: unknown) {
    return validateMultiple(this.validationService, [
      {
        name: 'sessionData',
        value: sessionData,
        validator: value => this.validationService.validateStudySessionRecord(value)
      }
    ]);
  }
}

/**
 * Create validation error with context
 */
export function createValidationError(
  field: string,
  value: unknown,
  expectedType: string,
  additionalInfo?: string
): Error {
  const valueType = Array.isArray(value) ? 'array' : typeof value;
  const info = additionalInfo ? ` (${additionalInfo})` : '';
  return new Error(`Invalid ${field}: expected ${expectedType}, got ${valueType}${info}`);
}

/**
 * Type guard for checking if a value is a valid flashcard ID
 */
export function isValidCardId(value: unknown): value is string {
  return typeof value === 'string' && /^[a-zA-Z0-9\-_]+$/.test(value);
}

/**
 * Type guard for checking if a value is a valid review quality
 */
export function isValidReviewQuality(value: unknown): value is 0 | 1 | 2 | 3 | 4 | 5 {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 5;
}

/**
 * Type guard for checking if a value is a valid date string
 */
export function isValidDateString(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const date = new Date(value);
  return !isNaN(date.getTime());
}

/**
 * Safe type assertion with validation
 */
export function assertValidType<T>(
  value: unknown,
  validator: (value: unknown) => ValidationResult<T>,
  errorMessage?: string
): asserts value is T {
  const result = validator(value);
  if (!result.isValid) {
    throw new Error(errorMessage || `Validation failed: ${result.errors.join(', ')}`);
  }
}
