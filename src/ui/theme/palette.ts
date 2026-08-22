import type { DifficultyLevel } from '../../types/index.js';

/**
 * Ink colour *names*, not hex.
 *
 * Names resolve through the terminal's own 16-colour palette, so a user's
 * chosen colour scheme still applies. Hard-coded hex overrides it and looks
 * wrong in half the terminals out there.
 */
export type InkColor = string;

/**
 * Semantic slots, plus one slot per difficulty level so `palette[difficulty]`
 * indexes directly instead of needing a lookup table at each call site.
 */
export interface ThemePalette {
  label: string;
  primary: InkColor;
  secondary: InkColor;
  text: InkColor;
  muted: InkColor;
  success: InkColor;
  warning: InkColor;
  error: InkColor;
  new: InkColor;
  learning: InkColor;
  young: InkColor;
  mature: InkColor;
}

export const THEMES = {
  default: {
    label: 'Default',
    primary: 'cyanBright',
    secondary: 'magentaBright',
    text: 'white',
    muted: 'gray',
    success: 'greenBright',
    warning: 'yellow',
    error: 'redBright',
    new: 'yellow',
    learning: 'cyan',
    young: 'green',
    mature: 'magenta'
  },
  forest: {
    label: 'Forest',
    primary: 'green',
    secondary: 'greenBright',
    text: 'white',
    muted: 'gray',
    success: 'greenBright',
    warning: 'yellow',
    error: 'red',
    new: 'yellowBright',
    learning: 'cyan',
    young: 'green',
    mature: 'blueBright'
  },
  mono: {
    label: 'Monochrome',
    primary: 'white',
    secondary: 'gray',
    text: 'white',
    muted: 'gray',
    success: 'white',
    warning: 'white',
    error: 'white',
    new: 'gray',
    learning: 'gray',
    young: 'white',
    mature: 'whiteBright'
  },
  dracula: {
    label: 'Dracula',
    primary: 'magenta',
    secondary: 'cyan',
    text: 'whiteBright',
    muted: 'gray',
    success: 'green',
    warning: 'yellow',
    error: 'red',
    new: 'yellow',
    learning: 'cyan',
    young: 'green',
    mature: 'magentaBright'
  }
} as const satisfies Record<string, ThemePalette>;

export type ThemeId = keyof typeof THEMES;

export const THEME_IDS = Object.keys(THEMES) as ThemeId[];

export const DEFAULT_THEME_ID: ThemeId = 'default';

export function getTheme(id: ThemeId | undefined): ThemePalette {
  return THEMES[id ?? DEFAULT_THEME_ID] ?? THEMES[DEFAULT_THEME_ID];
}

/** Colour for a card's difficulty bucket. */
export function difficultyColor(theme: ThemePalette, difficulty: DifficultyLevel): InkColor {
  return theme[difficulty];
}
