#!/usr/bin/env node
import { createRequire } from 'node:module';
import { createAppStore, runInteractive, runStudyOnly } from './app.js';
import { helpText, parseArgs } from './args.js';
import { showError } from '../ui/messages.js';

const require = createRequire(import.meta.url);
const { version } = require('../../package.json') as { version: string };

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
    case 'interactive': {
      const store = createAppStore();

      // Deferred writes must not be lost when the process is interrupted.
      const flushAndExit = (code: number) => () => {
        try {
          store.flush();
        } catch (error) {
          showError(
            `Could not save before exiting: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
        process.exit(code);
      };
      process.once('SIGINT', flushAndExit(130));
      process.once('SIGTERM', flushAndExit(143));

      try {
        await (command === 'study' ? runStudyOnly(store) : runInteractive(store));
      } finally {
        store.dispose();
      }
      return 0;
    }
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
