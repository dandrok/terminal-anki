import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FlashcardRepository } from '../../src/storage/repository.js';
import { emptyPersistedData } from '../../src/storage/serialization.js';
import { makeCard } from '../helpers.js';

let workspace: string;
let dataFile: string;
const warnings: string[] = [];

const repo = (overrides: Partial<ConstructorParameters<typeof FlashcardRepository>[0]> = {}) =>
  new FlashcardRepository({
    dataFile,
    legacyFile: null,
    onWarning: message => warnings.push(message),
    ...overrides
  });

beforeEach(() => {
  workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'anki-repo-'));
  dataFile = path.join(workspace, 'nested', 'flashcards.json');
  warnings.length = 0;
});

afterEach(() => {
  fs.rmSync(workspace, { recursive: true, force: true });
});

describe('load', () => {
  it('reports a new collection when nothing is stored', () => {
    const result = repo().load();
    expect(result.isNew).toBe(true);
    expect(result.data.cards).toEqual([]);
  });

  it('round-trips cards through a save and load', () => {
    const data = emptyPersistedData();
    data.cards = [makeCard({ front: 'Q', back: 'A', tags: ['t'] })];

    const repository = repo();
    repository.save(data);

    const loaded = repo().load();
    expect(loaded.isNew).toBe(false);
    expect(loaded.data.cards).toHaveLength(1);
    expect(loaded.data.cards[0]).toMatchObject({ front: 'Q', back: 'A', tags: ['t'] });
    expect(loaded.data.cards[0].nextReview).toBeInstanceOf(Date);
  });
});

describe('load with a corrupt file', () => {
  beforeEach(() => {
    fs.mkdirSync(path.dirname(dataFile), { recursive: true });
    fs.writeFileSync(dataFile, '{ this is not json');
  });

  it('preserves the unreadable file instead of destroying it', () => {
    // Regression: a parse failure replaced the file with sample cards.
    const result = repo().load();

    expect(result.corruptBackup).toBeDefined();
    expect(fs.existsSync(result.corruptBackup!)).toBe(true);
    expect(fs.readFileSync(result.corruptBackup!, 'utf-8')).toBe('{ this is not json');
    expect(result.data.cards).toEqual([]);
    expect(warnings).toHaveLength(1);
  });

  it('does not seed sample cards over the top', () => {
    expect(repo().load().data.cards).toEqual([]);
  });

  it('refuses to write when the file could not be backed up', () => {
    const repository = new FlashcardRepository({
      dataFile,
      legacyFile: null,
      onWarning: message => warnings.push(message)
    });
    // Force the backup copy to fail by making the directory read-only.
    const original = fs.copyFileSync;
    (fs as { copyFileSync: typeof fs.copyFileSync }).copyFileSync = () => {
      throw new Error('denied');
    };

    try {
      repository.load();
      expect(repository.isReadOnly).toBe(true);

      repository.save(emptyPersistedData());
      expect(fs.readFileSync(dataFile, 'utf-8')).toBe('{ this is not json');
    } finally {
      (fs as { copyFileSync: typeof fs.copyFileSync }).copyFileSync = original;
    }
  });
});

describe('legacy migration', () => {
  it('reads the legacy file and copies it to the new location', () => {
    const legacyFile = path.join(workspace, 'legacy', 'flashcards.json');
    fs.mkdirSync(path.dirname(legacyFile), { recursive: true });
    fs.writeFileSync(
      legacyFile,
      JSON.stringify({ cards: [{ id: '1', front: 'Old', back: 'Card' }] })
    );

    const result = new FlashcardRepository({
      dataFile,
      legacyFile,
      onWarning: message => warnings.push(message)
    }).load();

    expect(result.migratedFrom).toBe(legacyFile);
    expect(result.data.cards[0]).toMatchObject({ front: 'Old' });
    expect(fs.existsSync(dataFile)).toBe(true);
    // The legacy file is left in place as a safety net.
    expect(fs.existsSync(legacyFile)).toBe(true);
  });

  it('prefers the new location once it exists', () => {
    const legacyFile = path.join(workspace, 'legacy', 'flashcards.json');
    fs.mkdirSync(path.dirname(legacyFile), { recursive: true });
    fs.writeFileSync(legacyFile, JSON.stringify({ cards: [{ id: '1', front: 'Old', back: 'x' }] }));

    const data = emptyPersistedData();
    data.cards = [makeCard({ front: 'Current' })];
    new FlashcardRepository({ dataFile, legacyFile: null }).save(data);

    const result = new FlashcardRepository({ dataFile, legacyFile }).load();
    expect(result.migratedFrom).toBeUndefined();
    expect(result.data.cards[0]).toMatchObject({ front: 'Current' });
  });
});

describe('save', () => {
  it('creates missing directories', () => {
    repo().save(emptyPersistedData());
    expect(fs.existsSync(dataFile)).toBe(true);
  });

  it('leaves no temporary files behind', () => {
    repo().save(emptyPersistedData());
    const leftovers = fs.readdirSync(path.dirname(dataFile)).filter(name => name.endsWith('.tmp'));
    expect(leftovers).toEqual([]);
  });

  it('writes formatted JSON', () => {
    repo().save(emptyPersistedData());
    expect(fs.readFileSync(dataFile, 'utf-8')).toContain('\n  "version"');
  });
});
