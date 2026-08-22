#!/usr/bin/env node
import { createRequire } from 'node:module';
import { TerminalAnki } from './app.js';
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
      await new TerminalAnki().studyMode();
      return 0;
    case 'interactive':
      await new TerminalAnki().run();
      return 0;
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
