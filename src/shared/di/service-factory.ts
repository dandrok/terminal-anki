import { DIContainer } from './container.js';
import { ServiceLocator } from './service-locator.js';
import { SERVICE_TOKENS } from './index.js';
import {
  createConfiguredContainer,
  validateServiceConfiguration
} from './service-configuration.js';
import {
  IFlashcardService,
  IStatisticsService,
  ISessionService,
  IAchievementService,
  ILearningStreakService,
  IDataRepository,
  ISpacedRepetitionService
} from '../interfaces/services.js';

/**
 * Service Factory - Provides convenient access to configured services
 * This is the main entry point for the dependency injection system
 */

/**
 * Global service factory instance
 */
class ServiceFactory {
  private container: DIContainer | null = null;
  private locator: ServiceLocator | null = null;

  /**
   * Initialize the service factory
   */
  initialize(): void {
    if (this.container) {
      return; // Already initialized
    }

    try {
      // Create and configure container
      this.container = createConfiguredContainer();

      // Create service locator
      this.locator = new ServiceLocator(this.container);
    } catch (error) {
      throw new Error(
        `Failed to initialize service factory: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get the DI container
   */
  getContainer(): DIContainer {
    if (!this.container) {
      throw new Error('Service factory has not been initialized.');
    }
    return this.container;
  }

  /**
   * Get the service locator
   */
  getLocator(): ServiceLocator {
    if (!this.locator) {
      throw new Error('Service factory has not been initialized.');
    }
    return this.locator;
  }

  /**
   * Get flashcard service
   */
  getFlashcardService(): IFlashcardService {
    const result = this.getLocator().get<IFlashcardService>(SERVICE_TOKENS.FLASHCARD_SERVICE);
    if (!result.success) {
      throw new Error(`Failed to get FlashcardService: ${result.error.message}`);
    }
    return result.data;
  }

  /**
   * Get statistics service
   */
  getStatisticsService(): IStatisticsService {
    const result = this.getLocator().get<IStatisticsService>(SERVICE_TOKENS.STATISTICS_SERVICE);
    if (!result.success) {
      throw new Error(`Failed to get StatisticsService: ${result.error.message}`);
    }
    return result.data;
  }

  /**
   * Get session service
   */
  getSessionService(): ISessionService {
    const result = this.getLocator().get<ISessionService>(SERVICE_TOKENS.SESSION_SERVICE);
    if (!result.success) {
      throw new Error(`Failed to get SessionService: ${result.error.message}`);
    }
    return result.data;
  }

  /**
   * Get achievement service
   */
  getAchievementService(): IAchievementService {
    const result = this.getLocator().get<IAchievementService>(SERVICE_TOKENS.ACHIEVEMENT_SERVICE);
    if (!result.success) {
      throw new Error(`Failed to get AchievementService: ${result.error.message}`);
    }
    return result.data;
  }

  /**
   * Get learning streak service
   */
  getLearningStreakService(): ILearningStreakService {
    const result = this.getLocator().get<ILearningStreakService>(
      SERVICE_TOKENS.LEARNING_STREAK_SERVICE
    );
    if (!result.success) {
      throw new Error(`Failed to get LearningStreakService: ${result.error.message}`);
    }
    return result.data;
  }

  /**
   * Get data repository
   */
  getDataRepository(): IDataRepository {
    const result = this.getLocator().get<IDataRepository>(SERVICE_TOKENS.DATA_REPOSITORY);
    if (!result.success) {
      throw new Error(`Failed to get DataRepository: ${result.error.message}`);
    }
    return result.data;
  }

  /**
   * Get spaced repetition service
   */
  getSpacedRepetitionService(): ISpacedRepetitionService {
    const result = this.getLocator().get<ISpacedRepetitionService>(
      SERVICE_TOKENS.SPACED_REPETITION_SERVICE
    );
    if (!result.success) {
      throw new Error(`Failed to get SpacedRepetitionService: ${result.error.message}`);
    }
    return result.data;
  }

  /**
   * Get any service by token
   */
  getService<T>(token: string): T {
    const result = this.getLocator().get<T>(token);
    if (!result.success) {
      throw new Error(`Failed to get service '${token}': ${result.error.message}`);
    }
    return result.data;
  }

  /**
   * Check if a service is registered
   */
  hasService(token: string): boolean {
    return this.getLocator().has(token);
  }

  /**
   * Reset the service factory (for testing)
   */
  reset(): void {
    this.container = null;
    this.locator = null;
  }

  /**
   * Get service factory status
   */
  getStatus(): {
    initialized: boolean;
    containerSize: number;
    services: string[];
  } {
    return {
      initialized: this.container !== null,
      containerSize: this.container?.getRegisteredServices().length || 0,
      services: this.container?.getRegisteredServices() || []
    };
  }
}

// Export singleton instance
export const serviceFactory = new ServiceFactory();

/**
 * Convenience functions for common services
 */
export const getFlashcardService = () => serviceFactory.getFlashcardService();
export const getStatisticsService = () => serviceFactory.getStatisticsService();
export const getSessionService = () => serviceFactory.getSessionService();
export const getAchievementService = () => serviceFactory.getAchievementService();
export const getLearningStreakService = () => serviceFactory.getLearningStreakService();
export const getDataRepository = () => serviceFactory.getDataRepository();
export const getSpacedRepetitionService = () => serviceFactory.getSpacedRepetitionService();

/**
 * Initialize the service factory (call once at application startup)
 */
export function initializeServices(): void {
  serviceFactory.initialize();
}

/**
 * Get the service factory instance
 */
export function getServiceFactory(): ServiceFactory {
  return serviceFactory;
}
