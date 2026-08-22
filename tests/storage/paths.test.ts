import { homedir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { corruptBackupPath, resolveDataDir, resolveDataFile } from '../../src/storage/paths.js';

describe('resolveDataDir', () => {
  it('prefers an explicit override', () => {
    expect(resolveDataDir({ TERMINAL_ANKI_DATA_DIR: '/tmp/anki-data' })).toBe('/tmp/anki-data');
  });

  it('falls back to XDG_DATA_HOME', () => {
    expect(resolveDataDir({ XDG_DATA_HOME: '/home/x/.local/share' })).toBe(
      path.join('/home/x/.local/share', 'terminal-anki')
    );
  });

  it('ignores a relative XDG_DATA_HOME', () => {
    expect(resolveDataDir({ XDG_DATA_HOME: 'relative/path' })).toBe(
      path.join(homedir(), '.terminal-anki')
    );
  });

  it('falls back to the home directory', () => {
    expect(resolveDataDir({})).toBe(path.join(homedir(), '.terminal-anki'));
  });

  it('never resolves inside the installed package', () => {
    // Regression: data was written next to the package, so a global install
    // lost every card on npm update.
    const packageRoot = path.resolve(import.meta.dirname, '..', '..');
    expect(resolveDataDir({}).startsWith(packageRoot)).toBe(false);
  });

  it('ignores blank environment values', () => {
    expect(resolveDataDir({ TERMINAL_ANKI_DATA_DIR: '   ', XDG_DATA_HOME: '  ' })).toBe(
      path.join(homedir(), '.terminal-anki')
    );
  });
});

describe('resolveDataFile', () => {
  it('appends the data file name', () => {
    expect(resolveDataFile({ TERMINAL_ANKI_DATA_DIR: '/tmp/anki' })).toBe(
      path.join('/tmp/anki', 'flashcards.json')
    );
  });
});

describe('corruptBackupPath', () => {
  it('produces a timestamped sibling path', () => {
    const backup = corruptBackupPath('/tmp/anki/flashcards.json', new Date('2026-08-22T10:20:30Z'));
    expect(backup).toBe('/tmp/anki/flashcards.json.corrupt-2026-08-22T10-20-30-000Z.bak');
  });
});
