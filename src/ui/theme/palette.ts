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
  /**
   * Heatmap shades for levels 1-4; level 0 uses `muted`.
   *
   * Part of the theme rather than hard-coded green, so the grid belongs to the
   * scheme the rest of the app is drawn in — and so the monochrome theme gets a
   * ramp that actually reads.
   */
  heat: readonly [InkColor, InkColor, InkColor, InkColor];
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
    mature: 'magenta',
    heat: ['green', 'green', 'greenBright', 'greenBright']
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
    mature: 'blueBright',
    heat: ['green', 'green', 'greenBright', 'greenBright']
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
    mature: 'whiteBright',
    heat: ['gray', 'white', 'white', 'whiteBright']
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
    mature: 'magentaBright',
    heat: ['magenta', 'magenta', 'magentaBright', 'magentaBright']
  }
} as const satisfies Record<string, ThemePalette>;

export type ThemeId = keyof typeof THEMES;

export const THEME_IDS = Object.keys(THEMES) as ThemeId[];

export const DEFAULT_THEME_ID: ThemeId = 'default';

export function getTheme(id: ThemeId | undefined): ThemePalette {
  return THEMES[id ?? DEFAULT_THEME_ID] ?? THEMES[DEFAULT_THEME_ID];
}
