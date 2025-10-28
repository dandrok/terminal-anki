/**
 * Study session configuration constants
 */
export const SESSION_LIMITS = {
  QUICK: 10,
  STANDARD: 25,
  INTENSIVE: 50,
  CUSTOM_MIN: 1,
  CUSTOM_MAX: 100
} as const;

export const SESSION_TYPES = {
  DUE: 'due' as const,
  CUSTOM: 'custom' as const,
  ALL: 'all' as const
};

export const DIFFICULTY_LEVELS = {
  NEW: 'new' as const,
  LEARNING: 'learning' as const,
  YOUNG: 'young' as const,
  MATURE: 'mature' as const
};

export const DIFFICULTY_RANGES = {
  [DIFFICULTY_LEVELS.NEW]: { min: 0, max: 1 },
  [DIFFICULTY_LEVELS.LEARNING]: { min: 2, max: 7 },
  [DIFFICULTY_LEVELS.YOUNG]: { min: 8, max: 30 },
  [DIFFICULTY_LEVELS.MATURE]: { min: 31, max: Infinity }
} as const;

export const REVIEW_QUALITY_LABELS = {
  0: '× Again (0) - Show card soon',
  1: '◐ Hard (1)',
  3: '◑ Good (3)',
  4: '◒ Easy (4)',
  5: '◎ Perfect (5)'
} as const;

export const SM2_DEFAULTS = {
  INITIAL_EASINESS: 2.5,
  MINIMUM_EASINESS: 1.3,
  INITIAL_INTERVAL: 1,
  INITIAL_INTERVAL_REPETITION_2: 6,
  FAILED_INTERVAL: 1,
  FAILED_REVIEW_DELAY_MINUTES: 10
} as const;
