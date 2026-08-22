import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import type { Screen } from '../ui/screens/Screen.js';

/** Hidden flag used to run a single screen in a child process. */
export const RUN_SCREEN_FLAG = '--internal-run-screen';

const entryPoint = (): string => fileURLToPath(new URL('./main.js', import.meta.url));

/**
 * Run one screen in a child process, inheriting this terminal.
 *
 * Resolves when the child exits, whatever its status: a failed screen must not
 * take the menu down with it.
 */
export function runScreenInChildProcess(screen: Screen): Promise<void> {
  return new Promise(resolve => {
    const child = spawn(process.execPath, [entryPoint(), RUN_SCREEN_FLAG, screen], {
      stdio: 'inherit',
      env: process.env
    });
    child.once('close', () => resolve());
    child.once('error', () => resolve());
  });
}
