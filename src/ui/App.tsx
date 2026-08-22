import { useEffect, useState } from 'react';
import { useApp } from 'ink';
import { Router } from './Router.js';
import { StoreContext } from './hooks/useStore.js';
import { ThemeContext } from './hooks/useTheme.js';
import type { Screen } from './screens/Screen.js';
import { DEFAULT_THEME_ID, type ThemeId } from './theme/palette.js';
import type { Store } from '../state/store.js';
import type { Flashcard } from '../types/index.js';

export interface AppProps {
  store: Store;
  themeId?: ThemeId;
  initialScreen?: Screen;
}

export function App({ store, themeId = DEFAULT_THEME_ID, initialScreen = 'menu' }: AppProps) {
  const { exit } = useApp();
  const [screen, setScreen] = useState<Screen>(initialScreen);
  const [editing, setEditing] = useState<Flashcard | undefined>(undefined);

  useEffect(() => {
    if (screen === 'exit') {
      exit();
    }
  }, [screen, exit]);

  return (
    <StoreContext.Provider value={store}>
      <ThemeContext.Provider value={themeId}>
        <Router
          screen={screen}
          onNavigate={setScreen}
          onQuit={() => {
            setScreen('exit');
          }}
          editing={editing}
          onEdit={card => {
            setEditing(card);
            setScreen('edit');
          }}
        />
      </ThemeContext.Provider>
    </StoreContext.Provider>
  );
}
