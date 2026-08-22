#!/usr/bin/env node
import { createRequire } from 'node:module';
import { helpText, parseArgs } from './args.js';
import { showError } from '../ui/messages.js';

const require = createRequire(import.meta.url);
const { version } = require('../../package.json') as { version: string };

/**
 * Interactive mode only.
 *
 * Ink and React are reached through a dynamic import so `--help` and
 * `--version` never load them: they cost roughly 200ms (~53ms without, ~260ms
 * with). `tests/cli/startup-budget.test.ts` fails if a static import creeps in.
 */
async function runInteractive(studyOnly: boolean): Promise<number> {
  if (!process.stdin.isTTY) {
    showError('Terminal Anki needs an interactive terminal. Try `anki --help`.');
    return 1;
  }

  const [{ createStore }, { start }] = await Promise.all([
    import('../state/store.js'),
    import('../ui/start.js')
  ]);

  const store = createStore();

  // Deferred writes must not be lost when the process is interrupted.
  installFlushOnSignal(store);

  try {
    await start(store, studyOnly ? 'study' : 'menu');
  } finally {
    store.dispose();
  }
  return 0;
}

/**
 * Flush deferred writes when the process is interrupted.
 *
 * Both the parent and the child hold a store with pending grades, and Ctrl+C
 * reaches every process in the foreground group — so the child needs this just
 * as much as the parent, or a session interrupted mid-study loses its grades.
 */
function installFlushOnSignal(store: { flush: () => void }): void {
  const flushAndExit = (code: number) => () => {
    try {
      store.flush();
    } catch (error) {
      showError(
        `Could not save before exiting: ${error instanceof Error ? error.message : String(error)}`
      );
    }
    process.exit(code);
  };
  process.once('SIGINT', flushAndExit(130));
  process.once('SIGTERM', flushAndExit(143));
}

async function main(): Promise<number> {
  const { command, unknown } = parseArgs(process.argv.slice(2));

  if (unknown.length > 0) {
    showError(`Unknown option(s): ${unknown.join(', ')}`);
    console.log(helpText(version));
    return 1;
  }

  switch (command) {
    case 'help':
      console.log(helpText(version));
      return 0;
    case 'version':
      console.log(version);
      return 0;
    case 'study':
      return runInteractive(true);
    case 'interactive':
      return runInteractive(false);
  }
}

main()
  .then(code => {
    process.exitCode = code;
  })
  .catch((error: unknown) => {
    // A failure must not exit 0: scripts and CI need to see it.
    showError(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
