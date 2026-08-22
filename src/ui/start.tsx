import { render } from 'ink';
import { App } from './App.js';
import { createConfigStore } from '../storage/config-store.js';
import type { Store } from '../state/store.js';
import type { Screen } from './screens/Screen.js';

/**
 * Run the Ink interface until the user exits.
 *
 * Every screen is Ink now, so the child-process hop that used to run the
 * @clack/prompts screens is gone — along with the constraint that made it
 * necessary, namely that Ink and that library cannot share stdin sequentially
 * within one process.
 */
export async function start(store: Store, initialScreen: Screen = 'menu'): Promise<void> {
  // Read once, before the first frame, so the chosen theme is what paints it.
  const configStore = createConfigStore();
  const instance = render(
    <App
      store={store}
      configStore={configStore}
      initialConfig={configStore.load()}
      initialScreen={initialScreen}
    />
  );
  await instance.waitUntilExit();
  instance.clear();
}
