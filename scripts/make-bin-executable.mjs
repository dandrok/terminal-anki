#!/usr/bin/env node
import { chmodSync, existsSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

/**
 * Give every `bin` entry its executable bit back after a build.
 *
 * `tsc` preserves the mode of a file it overwrites, but a clean build creates
 * `dist/cli/main.js` as 644. npm sets the bit itself when installing a
 * published package, so this is invisible to end users — but `npm link` and
 * build-from-source produce a bin nobody can execute, which then fails in
 * whatever confusing way the shell's PATH resolution happens to produce.
 */
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const { bin } = require(resolve(root, 'package.json'));

const entries = typeof bin === 'string' ? [bin] : Object.values(bin ?? {});

for (const entry of entries) {
  const target = resolve(root, entry);
  if (!existsSync(target)) {
    console.error(`make-bin-executable: ${entry} does not exist`);
    process.exitCode = 1;
    continue;
  }

  const mode = statSync(target).mode;
  // Mirror the read bits into execute, so 644 becomes 755.
  chmodSync(target, mode | 0o111);
}
