import { useEffect, useState } from 'react';
import { useApp } from 'ink';
import { Router } from './Router.js';
import { StoreContext } from './hooks/useStore.js';
import { ThemeContext } from './hooks/useTheme.js';
import { isLegacyScreen, type Screen } from './screens/Screen.js';
import { DEFAULT_THEME_ID, type ThemeId } from './theme/palette.js';
import type { Store } from '../state/store.js';

export interface AppProps {
  store: Store;
  themeId?: ThemeId;
  /**
   * Screens not yet ported to Ink are handed back to the caller, which unmounts
   * Ink, runs the existing flow, and remounts. Removed once every screen lands.
   */
  onLegacyScreen: (screen: Screen) => void;
  onExit: () => void;
}

export function App({ store, themeId = DEFAULT_THEME_ID, onLegacyScreen, onExit }: AppProps) {
  const { exit } = useApp();
  const [screen, setScreen] = useState<Screen>('menu');

  useEffect(() => {
    if (screen === 'exit') {
      onExit();
      exit();
    } else if (isLegacyScreen(screen)) {
      onLegacyScreen(screen);
      exit();
    }
  }, [screen, exit, onLegacyScreen, onExit]);

  return (
    <StoreContext.Provider value={store}>
      <ThemeContext.Provider value={themeId}>
        <Router
          screen={screen}
          onNavigate={setScreen}
          onQuit={() => {
            setScreen('exit');
          }}
        />
      </ThemeContext.Provider>
    </StoreContext.Provider>
  );
}
