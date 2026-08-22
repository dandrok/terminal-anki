import { createContext, useContext } from 'react';
import { DEFAULT_CONFIG, type AppConfig } from '../../config/schema.js';

export interface ConfigContextValue {
  config: AppConfig;
  /** Persist a change and re-render everything reading the config. */
  update: (patch: Partial<AppConfig>) => void;
}

/**
 * Settings, with a working default.
 *
 * The default value is a real config and a no-op writer rather than `null`, so
 * a screen rendered on its own — in a test, or as a preview — behaves exactly
 * as it does in the application instead of throwing. Reading through context
 * is what makes a theme change repaint the mounted tree; a module-level read
 * would leave every already-rendered component on the old palette.
 */
function ignoreUpdate(): void {
  // Nothing above this component owns the settings, so there is nowhere to
  // write them. Screens still render, which is the point of the default.
}

export const ConfigContext = createContext<ConfigContextValue>({
  config: DEFAULT_CONFIG,
  update: ignoreUpdate
});

export function useConfig(): AppConfig {
  return useContext(ConfigContext).config;
}

export function useConfigUpdate(): (patch: Partial<AppConfig>) => void {
  return useContext(ConfigContext).update;
}
