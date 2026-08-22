import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const DATA_FILE_NAME = 'flashcards.json';

/**
 * Directory the application stores its data in.
 *
 * Resolution order: an explicit `TERMINAL_ANKI_DATA_DIR`, then
 * `$XDG_DATA_HOME/terminal-anki`, then `~/.terminal-anki`.
 */
export function resolveDataDir(env: NodeJS.ProcessEnv = process.env): string {
  const override = env.TERMINAL_ANKI_DATA_DIR?.trim();
  if (override) {
    return path.resolve(override);
  }

  const xdgDataHome = env.XDG_DATA_HOME?.trim();
  if (xdgDataHome && path.isAbsolute(xdgDataHome)) {
    return path.join(xdgDataHome, 'terminal-anki');
  }

  return path.join(homedir(), '.terminal-anki');
}

export function resolveDataFile(env: NodeJS.ProcessEnv = process.env): string {
  return path.join(resolveDataDir(env), DATA_FILE_NAME);
}

/**
 * Where releases up to 1.2.0 wrote their data: the package's own directory.
 *
 * That location is inside `node_modules` for a global install, so it is wiped
 * on every `npm update` and is read-only in many setups. It is still read once
 * on startup so existing data can be migrated across.
 */
export function legacyDataFile(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.join(here, '..', '..', DATA_FILE_NAME);
}

/** Timestamped sibling path used to preserve a file we cannot parse. */
export function corruptBackupPath(dataFile: string, now: Date = new Date()): string {
  const stamp = now.toISOString().replace(/[:.]/g, '-');
  return `${dataFile}.corrupt-${stamp}.bak`;
}
