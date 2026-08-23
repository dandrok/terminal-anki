import { useEffect, useMemo, useState } from 'react';
import { useApp } from 'ink';
import { Router } from './Router.js';
import { StoreContext } from './hooks/useStore.js';
import { ThemeContext } from './hooks/useTheme.js';
import { ConfigContext } from './hooks/useConfig.js';
import { ImageContext } from './hooks/useImages.js';
import { resolveImageSupport } from './images/detect.js';
import { findExternalRenderer } from './images/external.js';
import { createMediaStore } from '../storage/media-store.js';
import type { Screen } from './screens/Screen.js';
import { DEFAULT_CONFIG, withConfig, type AppConfig } from '../config/schema.js';
import type { ConfigStore } from '../storage/config-store.js';
import type { Store } from '../state/store.js';
import type { Flashcard } from '../types/index.js';

export interface AppProps {
  store: Store;
  /** Omitted in tests, where defaults are wanted and nothing should be written. */
  configStore?: ConfigStore;
  initialConfig?: AppConfig;
  initialScreen?: Screen;
}

export function App({ store, configStore, initialConfig, initialScreen = 'menu' }: AppProps) {
  const { exit } = useApp();
  const [screen, setScreen] = useState<Screen>(initialScreen);
  const [editing, setEditing] = useState<Flashcard | undefined>(undefined);
  const [config, setConfig] = useState<AppConfig>(initialConfig ?? DEFAULT_CONFIG);

  // Held in state rather than read from the file per render, so changing the
  // theme repaints the mounted tree instead of only new screens.
  const configValue = useMemo(
    () => ({
      config,
      update: (patch: Partial<AppConfig>) => {
        const next = withConfig(config, patch);
        setConfig(next);
        // Settings are small and change rarely, so they are written straight
        // through; there is nothing here worth batching.
        configStore?.save(next);
      }
    }),
    [config, configStore]
  );

  /**
   * Worked out once, not per card.
   *
   * Detection reads the environment and walks PATH looking for a helper; doing
   * that inside a render would repeat it on every keystroke of a session.
   */
  const imageValue = useMemo(() => {
    const renderer = findExternalRenderer();
    const support = resolveImageSupport(config.images, { hasExternalTool: Boolean(renderer) });
    const media = createMediaStore();
    return {
      support,
      ...(renderer ? { renderer } : {}),
      resolve: (name: string) => media.resolve(name)
    };
  }, [config.images]);

  useEffect(() => {
    if (screen === 'exit') {
      exit();
    }
  }, [screen, exit]);

  return (
    <StoreContext.Provider value={store}>
      <ConfigContext.Provider value={configValue}>
        <ThemeContext.Provider value={config.theme}>
          <ImageContext.Provider value={imageValue}>
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
          </ImageContext.Provider>
        </ThemeContext.Provider>
      </ConfigContext.Provider>
    </StoreContext.Provider>
  );
}
