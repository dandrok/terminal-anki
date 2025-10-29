import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DIContainer } from './container.js';
import { SERVICE_TOKENS } from './index.js';
import {
  configureServices,
  createConfiguredContainer,
  validateServiceConfiguration
} from './service-configuration.js';
import { serviceFactory, initializeServices } from './service-factory.js';

// Mock the data repository to avoid file system operations in tests
vi.mock('../../features/flashcards/services/data-repository.js', () => ({
  DataRepository: class {
    name = 'DataRepository';
    version = '1.0.0';
    loadData = vi.fn().mockResolvedValue({
      success: true,
      data: {
        cards: [],
        sessionHistory: [],
        learningStreak: {
          currentStreak: 0,
          longestStreak: 0,
          lastStudyDate: null,
          studyDates: []
        },
        achievements: []
      }
    });
    saveData = vi.fn().mockResolvedValue({ success: true });
  }
}));

describe('Dependency Injection System', () => {
  let container: DIContainer;

  beforeEach(() => {
    container = new DIContainer();
    vi.clearAllMocks();
  });

  describe('DIContainer', () => {
    it('should register and resolve services', () => {
      const testService = () => ({ name: 'TestService' });

      container.register('test-service', testService);

      const result = container.resolve('test-service');
      expect(result.success).toBe(true);
      expect(result.data.name).toBe('TestService');
    });

    it('should handle singleton services', () => {
      let callCount = 0;
      const testService = () => {
        callCount++;
        return { name: 'SingletonService', instance: callCount };
      };

      container.registerSingleton('singleton-service', testService);

      const result1 = container.resolve('singleton-service');
      const result2 = container.resolve('singleton-service');

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result1.data.instance).toBe(result2.data.instance);
      expect(callCount).toBe(1);
    });

    it('should handle transient services', () => {
      let callCount = 0;
      const testService = () => {
        callCount++;
        return { name: 'TransientService', instance: callCount };
      };

      container.registerTransient('transient-service', testService);

      const result1 = container.resolve('transient-service');
      const result2 = container.resolve('transient-service');

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result1.data.instance).toBe(1);
      expect(result2.data.instance).toBe(2);
      expect(callCount).toBe(2);
    });

    it('should detect circular dependencies', () => {
      container.register(
        'service-a',
        () => {
          const result = container.resolve('service-b');
          if (!result.success) throw result.error;
          return result.data;
        },
        { dependencies: ['service-b'] }
      );

      container.register(
        'service-b',
        () => {
          const result = container.resolve('service-a');
          if (!result.success) throw result.error;
          return result.data;
        },
        { dependencies: ['service-a'] }
      );

      const result = container.resolve('service-a');
      expect(result.success).toBe(false);
      expect(result.error.message).toContain('Circular dependency detected');
    });

    it('should validate dependencies', () => {
      container.register('service-a', () => ({ name: 'A' }), {
        dependencies: ['service-b', 'service-c']
      });

      // Don't register service-b and service-c

      const validation = container.validateDependencies();
      expect(validation.success).toBe(false);
      expect(validation.error.message).toContain('Missing dependency');
    });
  });

  describe('Service Configuration', () => {
    it('should configure all services', () => {
      expect(() => configureServices(container)).not.toThrow();

      const stats = container.getStats();
      expect(stats.totalServices).toBeGreaterThan(0);
    });

    it('should validate service configuration', () => {
      configureServices(container);

      const validation = validateServiceConfiguration(container);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should create a configured container', () => {
      const configuredContainer = createConfiguredContainer();

      expect(configuredContainer).toBeInstanceOf(DIContainer);

      const stats = configuredContainer.getStats();
      expect(stats.totalServices).toBeGreaterThan(0);
    });
  });

  describe('Service Factory', () => {
    beforeEach(() => {
      serviceFactory.reset();
    });

    it('should initialize properly', () => {
      expect(() => initializeServices()).not.toThrow();

      const status = serviceFactory.getStatus();
      expect(status.initialized).toBe(true);
      expect(status.containerSize).toBeGreaterThan(0);
    });

    it('should provide access to services', () => {
      initializeServices();

      // Test getting the data repository (should have minimal dependencies)
      const dataRepository = serviceFactory.getDataRepository();
      expect(dataRepository).toBeDefined();
      expect(dataRepository.name).toBe('DataRepository');
    });

    it('should handle service resolution errors gracefully', () => {
      // Don't initialize, try to get a service
      expect(() => serviceFactory.getDataRepository()).toThrow();
    });

    it('should track factory status', () => {
      const status = serviceFactory.getStatus();

      expect(status).toHaveProperty('initialized');
      expect(status).toHaveProperty('containerSize');
      expect(status).toHaveProperty('services');
      expect(status.initialized).toBe(false);

      initializeServices();

      const initializedStatus = serviceFactory.getStatus();
      expect(initializedStatus.initialized).toBe(true);
      expect(initializedStatus.containerSize).toBeGreaterThan(0);
    });
  });

  describe('Service Tokens', () => {
    it('should have all required tokens', () => {
      expect(SERVICE_TOKENS.DATA_REPOSITORY).toBe('data-repository');
      expect(SERVICE_TOKENS.FLASHCARD_SERVICE).toBe('flashcard-service');
      expect(SERVICE_TOKENS.STATISTICS_SERVICE).toBe('statistics-service');
      expect(SERVICE_TOKENS.SESSION_SERVICE).toBe('session-service');
      expect(SERVICE_TOKENS.ACHIEVEMENT_SERVICE).toBe('achievement-service');
      expect(SERVICE_TOKENS.LEARNING_STREAK_SERVICE).toBe('learning-streak-service');
      expect(SERVICE_TOKENS.SPACED_REPETITION_SERVICE).toBe('spaced-repetition-service');
    });
  });
});
