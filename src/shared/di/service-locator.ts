import { DIContainer } from './container.js';
import { Result, Ok, Err } from '../utils/result-type.js';

/**
 * Service Locator Pattern
 * Provides a global access point to services from the DI container
 * Note: Use this sparingly - constructor injection is preferred
 */

export class ServiceLocator {
  private container: DIContainer;

  constructor(container: DIContainer) {
    this.container = container;
  }

  /**
   * Get a service from the container
   */
  get<T>(token: string): Result<T, Error> {
    return this.container.resolve<T>(token);
  }

  /**
   * Check if a service is available
   */
  has(token: string): boolean {
    return this.container.has(token);
  }

  /**
   * Try to get a service, returning null if not found
   */
  tryGet<T>(token: string): T | null {
    const result = this.get<T>(token);
    return result.success ? result.data : null;
  }

  /**
   * Get a service or throw an error if not found
   */
  getRequired<T>(token: string): T {
    const result = this.get<T>(token);
    if (!result.success) {
      throw new Error(`Required service not found: ${token}. Error: ${result.error.message}`);
    }
    return result.data;
  }

  /**
   * Get multiple services at once
   */
  getMultiple<T>(tokens: string[]): Result<Array<T>, Error> {
    const services: Array<T> = [];
    const errors: string[] = [];

    for (const token of tokens) {
      const result = this.get<T>(token);
      if (result.success) {
        services.push(result.data);
      } else {
        errors.push(`${token}: ${result.error.message}`);
      }
    }

    if (errors.length > 0) {
      return Err(new Error(`Failed to resolve services:\n${errors.join('\n')}`));
    }

    return Ok(services);
  }

  /**
   * Get the underlying container (for advanced operations)
   */
  getContainer(): DIContainer {
    return this.container;
  }

  /**
   * Get service locator statistics
   */
  getStats(): {
    availableServices: number;
    serviceTokens: string[];
    containerStats: ReturnType<DIContainer['getStats']>;
  } {
    return {
      availableServices: this.container.getRegisteredServices().length,
      serviceTokens: this.container.getRegisteredServices(),
      containerStats: this.container.getStats()
    };
  }
}
