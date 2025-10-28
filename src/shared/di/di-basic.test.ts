import { describe, it, expect, beforeEach } from 'vitest';
import { DIContainer } from './container.js';
import { SERVICE_TOKENS } from './index.js';

describe('DI Container Basic Tests', () => {
  let container: DIContainer;

  beforeEach(() => {
    container = new DIContainer();
  });

  it('should register and resolve simple services', () => {
    const TestService = () => ({ name: 'TestService' });

    container.register(SERVICE_TOKENS.DATA_REPOSITORY, TestService);

    const result = container.resolve(SERVICE_TOKENS.DATA_REPOSITORY);
    expect(result.success).toBe(true);
    expect(result.data.name).toBe('TestService');
  });

  it('should handle singleton services', () => {
    let instanceCount = 0;
    const TestService = () => {
      instanceCount++;
      return { name: 'SingletonService', instance: instanceCount };
    };

    container.registerSingleton(SERVICE_TOKENS.DATA_REPOSITORY, TestService);

    const result1 = container.resolve(SERVICE_TOKENS.DATA_REPOSITORY);
    const result2 = container.resolve(SERVICE_TOKENS.DATA_REPOSITORY);

    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);
    expect(result1.data.instance).toBe(result2.data.instance);
    expect(instanceCount).toBe(1);
  });

  it('should handle transient services', () => {
    let instanceCount = 0;
    const TestService = () => {
      instanceCount++;
      return { name: 'TransientService', instance: instanceCount };
    };

    container.registerTransient(SERVICE_TOKENS.DATA_REPOSITORY, TestService);

    const result1 = container.resolve(SERVICE_TOKENS.DATA_REPOSITORY);
    const result2 = container.resolve(SERVICE_TOKENS.DATA_REPOSITORY);

    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);
    expect(result1.data.instance).toBe(1);
    expect(result2.data.instance).toBe(2);
    expect(instanceCount).toBe(2);
  });

  it('should return error for unregistered services', () => {
    const result = container.resolve('non-existent-service');
    expect(result.success).toBe(false);
    expect(result.error.message).toContain('Service not registered');
  });

  it('should check if services are registered', () => {
    expect(container.has(SERVICE_TOKENS.DATA_REPOSITORY)).toBe(false);

    container.register(SERVICE_TOKENS.DATA_REPOSITORY, () => ({}));

    expect(container.has(SERVICE_TOKENS.DATA_REPOSITORY)).toBe(true);
  });

  it('should provide container statistics', () => {
    container.registerSingleton(SERVICE_TOKENS.DATA_REPOSITORY, () => ({}));
    container.registerTransient(SERVICE_TOKENS.SPACED_REPETITION_SERVICE, () => ({}));

    const stats = container.getStats();
    expect(stats.totalServices).toBe(2);
    expect(stats.singletonServices).toBe(1);
    expect(stats.transientServices).toBe(1);
    expect(stats.instantiatedSingletons).toBe(0);
  });

  it('should clear all services', () => {
    container.register(SERVICE_TOKENS.DATA_REPOSITORY, () => ({}));
    expect(container.has(SERVICE_TOKENS.DATA_REPOSITORY)).toBe(true);

    container.clear();
    expect(container.has(SERVICE_TOKENS.DATA_REPOSITORY)).toBe(false);
  });

  it('should remove specific services', () => {
    container.register(SERVICE_TOKENS.DATA_REPOSITORY, () => ({}));
    container.register(SERVICE_TOKENS.SPACED_REPETITION_SERVICE, () => ({}));

    expect(container.has(SERVICE_TOKENS.DATA_REPOSITORY)).toBe(true);
    expect(container.has(SERVICE_TOKENS.SPACED_REPETITION_SERVICE)).toBe(true);

    const removed = container.remove(SERVICE_TOKENS.DATA_REPOSITORY);

    expect(removed).toBe(true);
    expect(container.has(SERVICE_TOKENS.DATA_REPOSITORY)).toBe(false);
    expect(container.has(SERVICE_TOKENS.SPACED_REPETITION_SERVICE)).toBe(true);
  });
});