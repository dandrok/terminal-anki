import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createConfigStore } from '../../src/storage/config-store.js';
import { DEFAULT_CONFIG, withConfig } from '../../src/config/schema.js';

let workspace: string;
let configFile: string;

beforeEach(() => {
  workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'anki-config-'));
  configFile = path.join(workspace, 'config.json');
});

afterEach(() => {
  fs.rmSync(workspace, { recursive: true, force: true });
});

describe('createConfigStore', () => {
  it('returns defaults when nothing has been written', () => {
    expect(createConfigStore({ configFile }).load()).toEqual(DEFAULT_CONFIG);
  });

  it('round-trips a saved config', () => {
    const store = createConfigStore({ configFile });
    const config = withConfig(DEFAULT_CONFIG, { theme: 'dracula', dailyGoal: 35, shuffle: false });
    store.save(config);

    expect(createConfigStore({ configFile }).load()).toEqual(config);
  });

  it('writes readable JSON, not a blob', () => {
    createConfigStore({ configFile }).save(DEFAULT_CONFIG);
    expect(fs.readFileSync(configFile, 'utf-8')).toContain('\n  "theme"');
  });

  it('creates the directory it writes into', () => {
    const nested = path.join(workspace, 'a', 'b', 'config.json');
    createConfigStore({ configFile: nested }).save(DEFAULT_CONFIG);
    expect(fs.existsSync(nested)).toBe(true);
  });

  it('leaves no temporary file behind', () => {
    createConfigStore({ configFile }).save(DEFAULT_CONFIG);
    expect(fs.readdirSync(workspace)).toEqual(['config.json']);
  });

  it('clamps nonsense that was hand-edited into the file', () => {
    fs.writeFileSync(configFile, JSON.stringify({ dailyGoal: 99_999, theme: 'neon' }));
    const config = createConfigStore({ configFile }).load();
    expect(config.dailyGoal).toBe(200);
    expect(config.theme).toBe(DEFAULT_CONFIG.theme);
  });

  it('moves an unreadable file aside and carries on with defaults', () => {
    // Unlike the card repository, which refuses to write over data it could
    // not read: settings are reconstructible in seconds, a deck is not.
    fs.writeFileSync(configFile, '{ not json at all');
    const onWarning = vi.fn();

    expect(createConfigStore({ configFile, onWarning }).load()).toEqual(DEFAULT_CONFIG);
    expect(onWarning).toHaveBeenCalledOnce();

    const kept = fs.readdirSync(workspace).filter(name => name.includes('.corrupt-'));
    expect(kept).toHaveLength(1);
    expect(fs.readFileSync(path.join(workspace, kept[0]), 'utf-8')).toBe('{ not json at all');
    expect(fs.existsSync(configFile)).toBe(false);
  });

  it('saves normally once the bad file has been moved aside', () => {
    fs.writeFileSync(configFile, 'nonsense');
    const store = createConfigStore({ configFile });
    store.load();
    store.save(withConfig(DEFAULT_CONFIG, { theme: 'mono' }));

    expect(createConfigStore({ configFile }).load().theme).toBe('mono');
  });

  it('warns instead of throwing when it cannot write', () => {
    // A directory where the file should be: the write must fail.
    fs.mkdirSync(configFile);
    const onWarning = vi.fn();

    expect(() => createConfigStore({ configFile, onWarning }).save(DEFAULT_CONFIG)).not.toThrow();
    expect(onWarning).toHaveBeenCalledOnce();
  });

  it('does not throw when even the cleanup fails', () => {
    // A directory sitting on the temp path: the write fails with EISDIR, and
    // then removing it fails too. Losing a colour scheme must not take the
    // application down with it.
    fs.mkdirSync(path.join(workspace, `.config.json.${process.pid}.tmp`));
    fs.mkdirSync(path.join(workspace, `.config.json.${process.pid}.tmp`, 'child'));
    const onWarning = vi.fn();

    expect(() => createConfigStore({ configFile, onWarning }).save(DEFAULT_CONFIG)).not.toThrow();
    expect(onWarning).toHaveBeenCalledOnce();
  });

  it('does not throw when the warning handler itself throws', () => {
    fs.writeFileSync(configFile, 'nonsense');
    const onWarning = vi.fn(() => {
      throw new Error('handler blew up');
    });

    expect(() => createConfigStore({ configFile, onWarning }).load()).not.toThrow();
  });

  it('is silent unless a warning handler asks to hear about it', () => {
    // A stray console.warn mid-render tears a hole in the Ink frame.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    fs.writeFileSync(configFile, 'nonsense');

    createConfigStore({ configFile }).load();

    expect(warn).not.toHaveBeenCalled();
    expect(log).not.toHaveBeenCalled();
    warn.mockRestore();
    log.mockRestore();
  });

  it('defaults its path to the data directory', () => {
    expect(createConfigStore().configFile.endsWith('config.json')).toBe(true);
  });
});
