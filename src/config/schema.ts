import { DEFAULT_THEME_ID, THEME_IDS, type ThemeId } from '../ui/theme/palette.js';
import { DEFAULT_DAILY_GOAL, HEATMAP_WEEKS } from '../ui/charts/heatmap.js';
import type { ImageMode } from '../ui/images/detect.js';

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
  /**
   * How to draw images on a card.
   *
   * `auto` reads the environment, which is a guess and sometimes a wrong one —
   * particularly through tmux, where passthrough has to be turned on by hand.
   * The other values exist so that guess can be overruled.
   */
  images: ImageMode;
}

export const DEFAULT_CONFIG: AppConfig = {
  version: CONFIG_VERSION,
  theme: DEFAULT_THEME_ID,
  // Taken from the chart module rather than repeated, so the value a fresh
  // install starts on and the one the chart falls back to cannot drift apart.
  dailyGoal: DEFAULT_DAILY_GOAL,
  heatmapWeeks: HEATMAP_WEEKS,
  defaultSessionLength: null,
  shuffle: true,
  images: 'auto'
};

/** Inclusive bounds, also used by the settings screen to step each value. */
export const LIMITS = {
  dailyGoal: { min: 5, max: 200, step: 5 },
  heatmapWeeks: { min: 4, max: 26, step: 1 }
} as const;

export const SESSION_LENGTHS: (number | null)[] = [null, 10, 25, 50];

export const IMAGE_MODES: ImageMode[] = ['auto', 'kitty', 'external', 'off'];

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
    shuffle: typeof raw.shuffle === 'boolean' ? raw.shuffle : DEFAULT_CONFIG.shuffle,
    images: IMAGE_MODES.includes(raw.images as ImageMode)
      ? (raw.images as ImageMode)
      : DEFAULT_CONFIG.images
  };
}

/** Apply a partial change, re-clamping whatever it touched. */
export function withConfig(config: AppConfig, patch: Partial<AppConfig>): AppConfig {
  return normalizeConfig({ ...config, ...patch });
}
