import { Result, Ok, Err } from '../utils/result-type.js';

/**
 * Dependency Injection Container
 * Modern TypeScript implementation with type safety and circular dependency detection
 */

export interface ServiceRegistration {
  factory: () => any;
  singleton: boolean;
  dependencies: string[];
  instance?: any;
}

export class DIContainer {
  private services: Map<string, ServiceRegistration> = new Map();
  private resolving: Set<string> = new Set();

  /**
   * Register a service with the container
   */
  register<T>(
    token: string,
    factory: () => T,
    options: {
      singleton?: boolean;
      dependencies?: string[];
    } = {}
  ): this {
    const registration: ServiceRegistration = {
      factory,
      singleton: options.singleton ?? false,
      dependencies: options.dependencies ?? []
    };

    this.services.set(token, registration);
    return this;
  }

  /**
   * Register a singleton service
   */
  registerSingleton<T>(token: string, factory: () => T, dependencies: string[] = []): this {
    return this.register(token, factory, { singleton: true, dependencies });
  }

  /**
   * Register a transient service (new instance each time)
   */
  registerTransient<T>(token: string, factory: () => T, dependencies: string[] = []): this {
    return this.register(token, factory, { singleton: false, dependencies });
  }

  /**
   * Resolve a service from the container
   */
  resolve<T>(token: string): Result<T, Error> {
    try {
      // Check for circular dependencies
      if (this.resolving.has(token)) {
        return Err(
          new Error(
            `Circular dependency detected: ${Array.from(this.resolving).join(' -> ')} -> ${token}`
          )
        );
      }

      const registration = this.services.get(token);
      if (!registration) {
        return Err(new Error(`Service not registered: ${token}`));
      }

      // Return singleton instance if it exists
      if (registration.singleton && registration.instance !== undefined) {
        return Ok(registration.instance as T);
      }

      // Mark as resolving to detect circular dependencies
      this.resolving.add(token);

      try {
        // Create the instance
        const instance = registration.factory();

        // Store singleton instance
        if (registration.singleton) {
          registration.instance = instance;
        }

        return Ok(instance as T);
      } finally {
        this.resolving.delete(token);
      }
    } catch (error) {
      return Err(error instanceof Error ? error : new Error(`Failed to resolve service: ${token}`));
    }
  }

  /**
   * Check if a service is registered
   */
  has(token: string): boolean {
    return this.services.has(token);
  }

  /**
   * Get all registered service tokens
   */
  getRegisteredServices(): string[] {
    return Array.from(this.services.keys());
  }

  /**
   * Get service registration information
   */
  getServiceInfo(token: string): ServiceRegistration | undefined {
    return this.services.get(token);
  }

  /**
   * Clear all services from the container
   */
  clear(): void {
    this.services.clear();
    this.resolving.clear();
  }

  /**
   * Remove a specific service from the container
   */
  remove(token: string): boolean {
    const removed = this.services.delete(token);
    if (removed) {
      this.resolving.delete(token);
    }
    return removed;
  }

  /**
   * Check if there are any circular dependencies in the current configuration
   */
  detectCircularDependencies(): Array<string[]> {
    const cycles: Array<string[]> = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (token: string, path: string[]): void => {
      if (recursionStack.has(token)) {
        // Found a cycle
        const cycleStart = path.indexOf(token);
        cycles.push([...path.slice(cycleStart), token]);
        return;
      }

      if (visited.has(token)) {
        return;
      }

      visited.add(token);
      recursionStack.add(token);

      const registration = this.services.get(token);
      if (registration) {
        for (const dependency of registration.dependencies) {
          dfs(dependency, [...path, token]);
        }
      }

      recursionStack.delete(token);
    };

    for (const token of this.services.keys()) {
      if (!visited.has(token)) {
        dfs(token, []);
      }
    }

    return cycles;
  }

  /**
   * Validate all service dependencies
   */
  validateDependencies(): Result<void, Error> {
    // Check for circular dependencies
    const cycles = this.detectCircularDependencies();
    if (cycles.length > 0) {
      const cycleMessages = cycles.map(cycle => `  ${cycle.join(' -> ')}`).join('\n');
      return Err(new Error(`Circular dependencies detected:\n${cycleMessages}`));
    }

    // Check for missing dependencies
    for (const [token, registration] of this.services) {
      for (const dependency of registration.dependencies) {
        if (!this.services.has(dependency)) {
          return Err(new Error(`Missing dependency: ${token} requires ${dependency}`));
        }
      }
    }

    return Ok(undefined);
  }

  /**
   * Get container statistics
   */
  getStats(): {
    totalServices: number;
    singletonServices: number;
    transientServices: number;
    instantiatedSingletons: number;
  } {
    let singletonCount = 0;
    let instantiatedCount = 0;

    for (const registration of this.services.values()) {
      if (registration.singleton) {
        singletonCount++;
        if (registration.instance !== undefined) {
          instantiatedCount++;
        }
      }
    }

    return {
      totalServices: this.services.size,
      singletonServices: singletonCount,
      transientServices: this.services.size - singletonCount,
      instantiatedSingletons: instantiatedCount
    };
  }
}
