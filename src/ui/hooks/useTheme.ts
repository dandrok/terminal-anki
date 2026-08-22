import { createContext, useContext } from 'react';
import { DEFAULT_THEME_ID, getTheme, type ThemeId, type ThemePalette } from '../theme/palette.js';

export const ThemeContext = createContext<ThemeId>(DEFAULT_THEME_ID);

/**
 * Active palette.
 *
 * Backed by context rather than a bare module read, so changing the theme
 * re-renders mounted components. `themeOverride` lets a settings screen preview
 * a theme using the real components instead of a mock.
 */
export function useTheme(themeOverride?: ThemeId): ThemePalette {
  const contextTheme = useContext(ThemeContext);
  return getTheme(themeOverride ?? contextTheme);
}
