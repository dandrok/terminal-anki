import { SERVICE_TOKENS } from './index.js';

/**
 * Dependency Injection Decorators
 * Modern TypeScript decorators for automatic dependency registration
 */

/**
 * Service decorator - registers a class as a service
 */
export function Service(token?: string) {
  return function <T extends { new (...args: any[]): any }>(constructor: T) {
    const serviceToken = token || constructor.name;

    // Store the registration info for later processing
    (constructor as any).__diToken = serviceToken;
    (constructor as any).__diDependencies = [];

    return constructor;
  };
}

/**
 * Inject decorator - marks constructor parameters for injection
 */
export function Inject(token: string) {
  return function (target: any, propertyKey: string | symbol | undefined, parameterIndex: number) {
    const existingDeps = (target.__diDependencies as string[]) || [];
    existingDeps[parameterIndex] = token;
    target.__diDependencies = existingDeps;
  };
}

/**
 * Singleton decorator - marks a service as singleton
 */
export function Singleton(token?: string) {
  return function <T extends { new (...args: any[]): any }>(constructor: T) {
    const serviceToken = token || constructor.name;

    (constructor as any).__diToken = serviceToken;
    (constructor as any).__diSingleton = true;
    (constructor as any).__diDependencies = [];

    return constructor;
  };
}

/**
 * Inject decorator for class properties
 */
export function InjectProperty(token: string) {
  return function (target: any, propertyKey: string | symbol) {
    const existingTokens = (target.__diPropertyTokens as Record<string, string>) || {};
    existingTokens[String(propertyKey)] = token;
    target.__diPropertyTokens = existingTokens;
  };
}

/**
 * Auto-inject decorator - automatically creates a container instance and registers the service
 */
export function AutoInject(container: any) {
  return function <T extends { new (...args: any[]): any }>(constructor: T) {
    const serviceToken = (constructor as any).__diToken || constructor.name;
    const dependencies = (constructor as any).__diDependencies || [];
    const isSingleton = (constructor as any).__diSingleton || false;

    // Register the service with the container
    const factory = () => {
      // Create dependency instances
      const dependencyInstances = dependencies.map((depToken: string) => {
        const result = container.resolve(depToken);
        if (!result.success) {
          throw new Error(`Failed to resolve dependency '${depToken}': ${result.error.message}`);
        }
        return result.data;
      });

      // Create the service instance
      return new constructor(...dependencyInstances);
    };

    if (isSingleton) {
      container.registerSingleton(serviceToken, factory, dependencies);
    } else {
      container.registerTransient(serviceToken, factory, dependencies);
    }

    return constructor;
  };
}

/**
 * Create a module with automatic service registration
 */
export function Module(token?: string) {
  return function (target: any) {
    const moduleToken = token || `${target.name}Module`;

    // Mark as a module for later processing
    (target as any).__diModuleToken = moduleToken;

    return target;
  };
}

/**
 * Utility function to register a service class with decorators
 */
export function registerServiceClass(container: any, ServiceClass: any): void {
  const token = (ServiceClass as any).__diToken || ServiceClass.name;
  const dependencies = (ServiceClass as any).__diDependencies || [];
  const isSingleton = (ServiceClass as any).__diSingleton || false;

  const factory = () => {
    // Create dependency instances
    const dependencyInstances = dependencies.map((depToken: string) => {
      const result = container.resolve(depToken);
      if (!result.success) {
        throw new Error(`Failed to resolve dependency '${depToken}': ${result.error.message}`);
      }
      return result.data;
    });

    // Create the service instance
    return new ServiceClass(...dependencyInstances);
  };

  if (isSingleton) {
    container.registerSingleton(token, factory, dependencies);
  } else {
    container.registerTransient(token, factory, dependencies);
  }
}

/**
 * Utility function to register all decorated services in a module
 */
export function registerModuleServices(container: any, ModuleClass: any): void {
  const moduleToken = (ModuleClass as any).__diModuleToken;

  // Find all decorated services in the module's prototype
  const services = Object.getOwnPropertyNames(ModuleClass.prototype)
    .filter(prop => prop !== 'constructor')
    .map(prop => ModuleClass.prototype[prop])
    .filter((prop: any) => (prop as any).__diToken);

  // Register each service
  for (const service of services) {
    registerServiceClass(container, service.constructor);
  }

  // Register the module itself if it has a token
  if (moduleToken) {
    container.registerSingleton(moduleToken, () => new ModuleClass());
  }
}

/**
 * Type-safe dependency injection decorator for constructors
 * Note: Advanced type processing would require more sophisticated implementation
 */
export function InjectDependencies(tokens: Record<number, string>) {
  return function (target: any, propertyKey: string | symbol | undefined, parameterIndex: number) {
    // Simplified implementation for now
    if (parameterIndex !== undefined && tokens[parameterIndex]) {
      Inject(tokens[parameterIndex])(target, propertyKey, parameterIndex);
    }
  };
}
