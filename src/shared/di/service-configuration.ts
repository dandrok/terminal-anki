import { DIContainer } from './container.js';
import { SERVICE_TOKENS } from './index.js';
import {
  IDataRepository,
  IFlashcardService,
  ISessionService,
  ISpacedRepetitionService,
  IAchievementService,
  ILearningStreakService
} from '../interfaces/services.js';
import { DataRepository } from '../../features/flashcards/services/data-repository.js';
import { FlashcardService } from '../../features/flashcards/services/flashcard-service-di.js';
import { StatisticsService } from '../../features/flashcards/services/statistics-service-di.js';
import { SessionService } from '../../features/flashcards/services/session-service-di.js';
import { SpacedRepetitionService } from '../../features/flashcards/services/spaced-repetition-service-di.js';
import { AchievementService } from '../../features/flashcards/services/achievement-service-di.js';
import { LearningStreakService } from '../../features/flashcards/services/learning-streak-service-di.js';
import { BackupManager } from '../../features/flashcards/services/backup-manager-di.js';
import { FilterService } from '../../features/flashcards/services/filter-service-di.js';
import { AnalyticsService } from '../../features/flashcards/services/analytics-service-di.js';
import { ValidationService } from '../services/validation-service.js';
import { ConfigService } from '../services/config-service.js';
import { CliService } from '../services/cli-service.js';
import { UiService } from '../services/ui-service.js';
/**
 * Service Configuration and Registration
 * Sets up all services with their dependencies
 */

/**
 * Configure and register all services in the DI container
 */
export function configureServices(container: DIContainer): void {
  // Register core services first (no dependencies)
  container.registerSingleton(
    SERVICE_TOKENS.SPACED_REPETITION_SERVICE,
    () => new SpacedRepetitionService()
  );

  // Register data repository
  container.registerSingleton(SERVICE_TOKENS.DATA_REPOSITORY, () => new DataRepository());

  // Register learning streak service (depends on data repository)
  container.registerSingleton(
    SERVICE_TOKENS.LEARNING_STREAK_SERVICE,
    () => {
      const dataRepositoryResult = container.resolve(SERVICE_TOKENS.DATA_REPOSITORY);
      if (!dataRepositoryResult.success) {
        throw new Error(`Failed to resolve DataRepository: ${dataRepositoryResult.error.message}`);
      }
      return new LearningStreakService(dataRepositoryResult.data as IDataRepository);
    },
    [SERVICE_TOKENS.DATA_REPOSITORY]
  );

  // Register session service (depends on flashcard service)
  container.registerSingleton(SERVICE_TOKENS.SESSION_SERVICE, () => {
    return new SessionService();
  });

  container.registerSingleton(SERVICE_TOKENS.VALIDATION_SERVICE, () => new ValidationService());
  // Register statistics service (depends on data repository and spaced repetition)
  container.registerSingleton(
    SERVICE_TOKENS.BACKUP_MANAGER,
    () => new BackupManager(container.resolve(SERVICE_TOKENS.DATA_REPOSITORY) as any)
  );
  container.registerSingleton(SERVICE_TOKENS.FILTER_SERVICE, () => new FilterService());
  container.registerSingleton(
    SERVICE_TOKENS.ANALYTICS_SERVICE,
    () => new AnalyticsService(container.resolve(SERVICE_TOKENS.SESSION_SERVICE) as any)
  );
  container.registerSingleton(SERVICE_TOKENS.CONFIG_SERVICE, () => new ConfigService());
  container.registerSingleton(SERVICE_TOKENS.CLI_SERVICE, () => new CliService());
  container.registerSingleton(SERVICE_TOKENS.UI_SERVICE, () => new UiService());
  container.registerSingleton(
    SERVICE_TOKENS.STATISTICS_SERVICE,
    () => {
      const dataRepositoryResult = container.resolve(SERVICE_TOKENS.DATA_REPOSITORY);
      const spacedRepetitionServiceResult = container.resolve(
        SERVICE_TOKENS.SPACED_REPETITION_SERVICE
      );

      if (!dataRepositoryResult.success) {
        throw new Error(`Failed to resolve DataRepository: ${dataRepositoryResult.error.message}`);
      }
      if (!spacedRepetitionServiceResult.success) {
        throw new Error(
          `Failed to resolve SpacedRepetitionService: ${spacedRepetitionServiceResult.error.message}`
        );
      }

      return new StatisticsService(
        dataRepositoryResult.data as IDataRepository,
        spacedRepetitionServiceResult.data as ISpacedRepetitionService
      );
    },
    [SERVICE_TOKENS.DATA_REPOSITORY, SERVICE_TOKENS.SPACED_REPETITION_SERVICE]
  );

  // Register achievement service (depends on flashcard and session services)
  container.registerSingleton(
    SERVICE_TOKENS.ACHIEVEMENT_SERVICE,
    () => {
      const sessionServiceResult = container.resolve(SERVICE_TOKENS.SESSION_SERVICE);

      if (!sessionServiceResult.success) {
        throw new Error(`Failed to resolve SessionService: ${sessionServiceResult.error.message}`);
      }

      return new AchievementService(sessionServiceResult.data as ISessionService);
    },
    [SERVICE_TOKENS.SESSION_SERVICE]
  );

  // Register flashcard service (depends on multiple services)
  container.registerSingleton(
    SERVICE_TOKENS.FLASHCARD_SERVICE,
    () => {
      const dataRepositoryResult = container.resolve(SERVICE_TOKENS.DATA_REPOSITORY);
      const spacedRepetitionServiceResult = container.resolve(
        SERVICE_TOKENS.SPACED_REPETITION_SERVICE
      );
      const achievementServiceResult = container.resolve(SERVICE_TOKENS.ACHIEVEMENT_SERVICE);
      const learningStreakServiceResult = container.resolve(SERVICE_TOKENS.LEARNING_STREAK_SERVICE);
      const sessionServiceResult = container.resolve(SERVICE_TOKENS.SESSION_SERVICE);

      if (!dataRepositoryResult.success) {
        throw new Error(`Failed to resolve DataRepository: ${dataRepositoryResult.error.message}`);
      }
      if (!spacedRepetitionServiceResult.success) {
        throw new Error(
          `Failed to resolve SpacedRepetitionService: ${spacedRepetitionServiceResult.error.message}`
        );
      }
      if (!achievementServiceResult.success) {
        throw new Error(
          `Failed to resolve AchievementService: ${achievementServiceResult.error.message}`
        );
      }
      if (!learningStreakServiceResult.success) {
        throw new Error(
          `Failed to resolve LearningStreakService: ${learningStreakServiceResult.error.message}`
        );
      }
      if (!sessionServiceResult.success) {
        throw new Error(`Failed to resolve SessionService: ${sessionServiceResult.error.message}`);
      }

      // Create initial state
      const initialState = {
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

      return new FlashcardService(
        dataRepositoryResult.data as IDataRepository,
        spacedRepetitionServiceResult.data as ISpacedRepetitionService,
        achievementServiceResult.data as IAchievementService,
        learningStreakServiceResult.data as ILearningStreakService,
        sessionServiceResult.data as ISessionService,
        initialState
      );
    },
    [
      SERVICE_TOKENS.DATA_REPOSITORY,
      SERVICE_TOKENS.SPACED_REPETITION_SERVICE,
      SERVICE_TOKENS.ACHIEVEMENT_SERVICE,
      SERVICE_TOKENS.LEARNING_STREAK_SERVICE,
      SERVICE_TOKENS.SESSION_SERVICE
    ]
  );
}

/**
 * Create a pre-configured container with all services
 */
export function createConfiguredContainer(): DIContainer {
  const container = new DIContainer();
  configureServices(container);
  return container;
}

/**
 * Get service configuration info for debugging
 */
export function getServiceConfiguration(): Array<{
  token: string;
  name: string;
  dependencies: string[];
  singleton: boolean;
}> {
  return [
    {
      token: SERVICE_TOKENS.DATA_REPOSITORY,
      name: 'DataRepository',
      dependencies: [],
      singleton: true
    },
    {
      token: SERVICE_TOKENS.SPACED_REPETITION_SERVICE,
      name: 'SpacedRepetitionService',
      dependencies: [],
      singleton: true
    },
    {
      token: SERVICE_TOKENS.LEARNING_STREAK_SERVICE,
      name: 'LearningStreakService',
      dependencies: [SERVICE_TOKENS.DATA_REPOSITORY],
      singleton: true
    },
    {
      token: SERVICE_TOKENS.STATISTICS_SERVICE,
      name: 'StatisticsService',
      dependencies: [SERVICE_TOKENS.DATA_REPOSITORY, SERVICE_TOKENS.SPACED_REPETITION_SERVICE],
      singleton: true
    },
    {
      token: SERVICE_TOKENS.ACHIEVEMENT_SERVICE,
      name: 'AchievementService',
      dependencies: [SERVICE_TOKENS.SESSION_SERVICE],
      singleton: true
    },
    {
      token: SERVICE_TOKENS.SESSION_SERVICE,
      name: 'SessionService',
      dependencies: [],
      singleton: true
    },
    {
      token: SERVICE_TOKENS.FLASHCARD_SERVICE,
      name: 'FlashcardService',
      dependencies: [
        SERVICE_TOKENS.DATA_REPOSITORY,
        SERVICE_TOKENS.SPACED_REPETITION_SERVICE,
        SERVICE_TOKENS.ACHIEVEMENT_SERVICE,
        SERVICE_TOKENS.LEARNING_STREAK_SERVICE,
        SERVICE_TOKENS.SESSION_SERVICE
      ],
      singleton: true
    }
  ];
}

/**
 * Validate service configuration
 */
export function validateServiceConfiguration(container: DIContainer): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Try to resolve all registered services
  const tokens = Object.values(SERVICE_TOKENS);

  for (const token of tokens) {
    const result = container.resolve(token);
    if (!result.success) {
      errors.push(`Failed to resolve ${token}: ${result.error.message}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
