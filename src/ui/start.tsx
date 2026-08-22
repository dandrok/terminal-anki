import { render } from 'ink';
import { App } from './App.js';
import { runScreenInChildProcess } from '../cli/subprocess.js';
import type { Screen } from './screens/Screen.js';
import type { Store } from '../state/store.js';

/**
 * Run the Ink interface until the user exits.
 *
 * Screens still served by the pre-Ink prompt library run in a child process.
 * That is not defensiveness: Ink and @clack/prompts cannot share stdin
 * sequentially within one process — the second library renders correctly but
 * never receives a keypress, reproducible in ~20 lines with no app code. A
 * child gets a clean stdin from the inherited terminal. Both this file's loop
 * and the child hop disappear once every screen is Ink.
 */
export async function start(store: Store): Promise<void> {
  for (;;) {
    let pending: Screen | null = null;
    let exited = false;

    const instance = render(
      <App
        store={store}
        onLegacyScreen={screen => {
          pending = screen;
        }}
        onExit={() => {
          exited = true;
        }}
      />
    );

    await instance.waitUntilExit();
    instance.clear();

    const screen: Screen | null = pending;
    if (exited || screen === null) {
      return;
    }

    // The child writes to the same file, so hand off a clean state and re-read
    // whatever it changed.
    store.flush();
    await runScreenInChildProcess(screen);
    store.reload();
  }
}
