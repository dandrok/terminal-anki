import { DEFAULT_THEME_ID, THEME_IDS, type ThemeId } from '../ui/theme/palette.js';

/** Bumped only when an old config can no longer be read as-is. */
export const CONFIG_VERSION = 1;

export interface AppConfig {
  version: number;
  theme: ThemeId;
  /** Cards in a day that fills a heatmap cell. */
  dailyGoal: number;
  /** Weeks the activity grid spans. */
  heatmapWeeks: number;
  /** Session size offered first on the study screen; null means "all due". */
  defaultSessionLength: number | null;
  /** Shuffle a session's cards rather than taking them in order. */
  shuffle: boolean;
}

export const DEFAULT_CONFIG: AppConfig = {
  version: CONFIG_VERSION,
  theme: DEFAULT_THEME_ID,
  dailyGoal: 20,
  heatmapWeeks: 15,
  defaultSessionLength: null,
  shuffle: true
};

/** Inclusive bounds, also used by the settings screen to step each value. */
export const LIMITS = {
  dailyGoal: { min: 5, max: 200, step: 5 },
  heatmapWeeks: { min: 4, max: 26, step: 1 }
} as const;

export const SESSION_LENGTHS: (number | null)[] = [null, 10, 25, 50];

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function readNumber(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }
  return clamp(Math.round(value), min, max);
}

/**
 * Coerce anything on disk into a usable config.
 *
 * Clamping rather than rejecting, on purpose: settings are not data. A file
 * that has been hand-edited into nonsense should start the application with
 * sensible values, never stop it from starting or — worse — take the card
 * collection down with it. Every field falls back independently, so one bad
 * entry does not discard the rest.
 */
export function normalizeConfig(input: unknown): AppConfig {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { ...DEFAULT_CONFIG };
  }

  const raw = input as Record<string, unknown>;
  const theme = raw.theme;
  const length = raw.defaultSessionLength;

  return {
    version: CONFIG_VERSION,
    theme:
      typeof theme === 'string' && (THEME_IDS as string[]).includes(theme)
        ? (theme as ThemeId)
        : DEFAULT_CONFIG.theme,
    dailyGoal: readNumber(
      raw.dailyGoal,
      DEFAULT_CONFIG.dailyGoal,
      LIMITS.dailyGoal.min,
      LIMITS.dailyGoal.max
    ),
    heatmapWeeks: readNumber(
      raw.heatmapWeeks,
      DEFAULT_CONFIG.heatmapWeeks,
      LIMITS.heatmapWeeks.min,
      LIMITS.heatmapWeeks.max
    ),
    // Null is a real choice here ("all due cards"), so it is kept rather than
    // treated as a missing value.
    defaultSessionLength:
      length === null ? null : typeof length === 'number' ? readNumber(length, 10, 1, 500) : null,
    shuffle: typeof raw.shuffle === 'boolean' ? raw.shuffle : DEFAULT_CONFIG.shuffle
  };
}

/** Apply a partial change, re-clamping whatever it touched. */
export function withConfig(config: AppConfig, patch: Partial<AppConfig>): AppConfig {
  return normalizeConfig({ ...config, ...patch });
}
