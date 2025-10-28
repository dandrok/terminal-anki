/**
 * Result type for functional error handling
 * Replaces try-catch with explicit error handling
 */
export type Result<T, E = Error> = { success: true; data: T } | { success: false; error: E };

export const Ok = <T, E = Error>(data: T): Result<T, E> => ({
  success: true,
  data
});

export const Err = <E>(error: E): Result<never, E> => ({
  success: false,
  error
});

export const map = <T, U, E>(result: Result<T, E>, fn: (data: T) => U): Result<U, E> => {
  if (result.success) {
    return Ok<U, E>(fn(result.data));
  }
  return result;
};

export const flatMap = <T, U, E>(
  result: Result<T, E>,
  fn: (data: T) => Result<U, E>
): Result<U, E> => {
  if (result.success) {
    return fn(result.data);
  }
  return result;
};

export const unwrap = <T, E>(result: Result<T, E>): T => {
  if (result.success) {
    return result.data;
  }
  throw result.error;
};

export const unwrapOr = <T, E>(result: Result<T, E>, defaultValue: T): T => {
  if (result.success) {
    return result.data;
  }
  return defaultValue;
};

export const isOk = <T, E>(result: Result<T, E>): result is { success: true; data: T } =>
  result.success;

export const isErr = <T, E>(result: Result<T, E>): result is { success: false; error: E } =>
  !result.success;
