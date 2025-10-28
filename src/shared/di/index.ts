/**
 * Barrel exports for dependency injection system
 */

export * from './container.js';
export * from './service-locator.js';
export * from './decorators.js';
export * from './service-configuration.js';
export * from './service-factory.js';

/**
 * Predefined service tokens for type safety
 */
export const SERVICE_TOKENS = {
  // Data persistence
  DATA_REPOSITORY: 'data-repository',
  BACKUP_MANAGER: 'backup-manager',

  // Flashcard services
  FLASHCARD_SERVICE: 'flashcard-service',
  FILTER_SERVICE: 'filter-service',

  // Analytics and statistics
  STATISTICS_SERVICE: 'statistics-service',
  ANALYTICS_SERVICE: 'analytics-service',

  // Learning algorithms
  SPACED_REPETITION_SERVICE: 'spaced-repetition-service',

  // Achievement system
  ACHIEVEMENT_SERVICE: 'achievement-service',

  // Learning streak
  LEARNING_STREAK_SERVICE: 'learning-streak-service',

  // Session management
  SESSION_SERVICE: 'session-service',

  // Validation
  VALIDATION_SERVICE: 'validation-service',

  // Configuration
  CONFIG_SERVICE: 'config-service',

  // CLI and UI
  CLI_SERVICE: 'cli-service',
  UI_SERVICE: 'ui-service'
} as const;

export type ServiceToken = (typeof SERVICE_TOKENS)[keyof typeof SERVICE_TOKENS];
