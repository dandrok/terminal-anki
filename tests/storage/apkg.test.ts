import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ApkgError, readApkg, readMediaMap } from '../../src/storage/apkg.js';

const FIXTURES = path.join(process.cwd(), 'tests', 'fixtures');
const legacy = () => readApkg(path.join(FIXTURES, 'legacy.apkg'));
const modern = () => readApkg(path.join(FIXTURES, 'modern.apkg'));

let workspace: string;

beforeEach(() => {
  workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'anki-apkg-test-'));
});

afterEach(() => {
  fs.rmSync(workspace, { recursive: true, force: true });
});

describe('readApkg formats', () => {
  it('reads a legacy package', () => {
    const deck = legacy();
    expect(deck.format).toBe('collection.anki2');
    expect(deck.notes).toHaveLength(7);
  });

  it('reads a modern zstd package', () => {
    // collection.anki21b plus a zstd protobuf media map — the format every
    // deck downloaded from AnkiWeb since 2022 uses.
    const deck = modern();
    expect(deck.format).toBe('collection.anki21b');
    expect(deck.notes).toHaveLength(7);
  });

  it('reads the same notes from either format', () => {
    expect(modern().notes).toEqual(legacy().notes);
  });

  it('prefers the newest collection when a package holds several', () => {
    // modern.apkg carries a deliberately unreadable collection.anki2 as well,
    // exactly as Anki writes one for backwards compatibility. Reading the old
    // one would silently drop everything added since it was made — here it
    // would fail outright, which is what makes this a real test.
    const deck = modern();
    expect(deck.format).toBe('collection.anki21b');
    expect(deck.notes).toHaveLength(7);
  });
});

describe('readApkg notes', () => {
  it('splits fields on the unit separator', () => {
    const note = legacy().notes.find(entry => entry.guid === 'guid-basic-1');
    expect(note?.fields).toEqual(['<b>hola</b>', 'hello']);
  });

  it('keeps the note guid, so a re-import is not a duplicate', () => {
    expect(legacy().notes.map(note => note.guid)).toContain('guid-image-1');
  });

  it('trims the padding Anki puts around its tag field', () => {
    const note = legacy().notes.find(entry => entry.guid === 'guid-basic-1');
    expect(note?.tags).toEqual(['greetings', 'spanish']);
  });

  it('leaves an untagged note with no tags rather than one empty one', () => {
    const note = legacy().notes.find(entry => entry.guid === 'guid-basic-2');
    expect(note?.tags).toEqual([]);
  });

  it('counts the cards a note generates, to spot a reverse', () => {
    const reversed = legacy().notes.find(entry => entry.guid === 'guid-rev-1');
    const plain = legacy().notes.find(entry => entry.guid === 'guid-basic-1');
    expect(reversed?.cardCount).toBe(2);
    expect(plain?.cardCount).toBe(1);
  });
});

describe('readApkg decks', () => {
  it('tags a note with the deck it is actually in', () => {
    const inSubdeck = legacy().notes.find(entry => entry.guid === 'guid-basic-1');
    expect(inSubdeck?.deck).toBe('Spanish::Verbs');
  });

  it('leaves a note in the Default deck untagged', () => {
    // Every collection has a Default deck and nobody chose it, so tagging half
    // an import with it says nothing about those cards.
    const inDefault = legacy().notes.find(entry => entry.guid === 'guid-image-1');
    expect(inDefault?.deck).toBeUndefined();
  });
});

describe('readApkg scheduling', () => {
  it('carries a reviewed card across instead of resetting it', () => {
    const note = legacy().notes.find(entry => entry.guid === 'guid-basic-1');
    expect(note?.scheduling).toMatchObject({ interval: 45, repetitions: 7, easiness: 2.65 });
  });

  it('converts the ease factor out of thousandths', () => {
    const note = legacy().notes.find(entry => entry.guid === 'guid-image-1');
    expect(note?.scheduling?.easiness).toBe(2.3);
  });

  it('leaves a brand new card with no scheduling', () => {
    const note = legacy().notes.find(entry => entry.guid === 'guid-basic-2');
    expect(note?.scheduling).toBeUndefined();
  });

  it('treats a card still in learning as new', () => {
    // A learning card's interval is in seconds, written negative. There is no
    // day interval there worth keeping.
    const note = legacy().notes.find(entry => entry.guid === 'guid-audio-1');
    expect(note?.scheduling).toBeUndefined();
  });

  it('dates the next review from the collection creation day', () => {
    const note = legacy().notes.find(entry => entry.guid === 'guid-basic-1');
    // Created 2026-01-01, due on day 30.
    expect(note?.scheduling?.nextReview?.getUTCFullYear()).toBe(2026);
    expect(note?.scheduling?.nextReview?.getUTCMonth()).toBe(0);
    expect(note?.scheduling?.nextReview?.getUTCDate()).toBe(31);
  });
});

describe('readApkg media', () => {
  it('resolves numbered entries back to their real filenames', () => {
    expect([...legacy().media.keys()]).toEqual(['heart.png']);
  });

  it('reads media out of the modern format, which compresses each file', () => {
    const data = modern().media.get('heart.png');
    expect(data?.subarray(1, 4).toString('utf-8')).toBe('PNG');
  });

  it('gives back the same bytes from either format', () => {
    expect(modern().media.get('heart.png')?.equals(legacy().media.get('heart.png')!)).toBe(true);
  });
});

describe('readMediaMap', () => {
  it('reads the legacy JSON map', () => {
    const data = Buffer.from(JSON.stringify({ '0': 'a.png', '1': 'b.jpg' }));
    expect([...readMediaMap(data)]).toEqual([
      ['0', 'a.png'],
      ['1', 'b.jpg']
    ]);
  });

  it('reads the modern protobuf map, by position', () => {
    // MediaEntries { repeated MediaEntry entries = 1 }, each { string name = 1 }
    const entry = (name: string) => {
      const bytes = Buffer.from(name);
      const inner = Buffer.concat([Buffer.from([0x0a, bytes.length]), bytes]);
      return Buffer.concat([Buffer.from([0x0a, inner.length]), inner]);
    };
    const data = Buffer.concat([entry('first.png'), entry('second.png')]);
    expect([...readMediaMap(data)]).toEqual([
      ['0', 'first.png'],
      ['1', 'second.png']
    ]);
  });

  it('reads a zstd-compressed protobuf map', () => {
    const bytes = Buffer.from('x.png');
    const inner = Buffer.concat([Buffer.from([0x0a, bytes.length]), bytes]);
    const raw = Buffer.concat([Buffer.from([0x0a, inner.length]), inner]);
    expect([...readMediaMap(Buffer.from(zlib.zstdCompressSync(raw)))]).toEqual([['0', 'x.png']]);
  });

  it('gives back nothing for an empty or unrecognised map', () => {
    expect(readMediaMap(Buffer.alloc(0)).size).toBe(0);
    expect(readMediaMap(Buffer.from([0xff, 0xff, 0xff])).size).toBe(0);
  });

  it('skips a JSON value that is not a filename', () => {
    expect(readMediaMap(Buffer.from(JSON.stringify({ '0': 42, '1': 'ok.png' }))).size).toBe(1);
  });
});

describe('readApkg failures', () => {
  it('says so when the package holds no collection', () => {
    expect(() => readApkg(path.join(FIXTURES, 'not-a-deck.apkg'))).toThrow(/no Anki collection/);
  });

  it('names what it did find, so the problem is diagnosable', () => {
    expect(() => readApkg(path.join(FIXTURES, 'not-a-deck.apkg'))).toThrow(/readme\.txt/);
  });

  it('reports a file that is not a zip at all', () => {
    const file = path.join(workspace, 'deck.apkg');
    fs.writeFileSync(file, 'this is not a zip');
    expect(() => readApkg(file)).toThrow(ApkgError);
  });

  it('reports a file it cannot read', () => {
    expect(() => readApkg(path.join(workspace, 'nope.apkg'))).toThrow(/could not read/);
  });

  it('leaves no temporary database behind', () => {
    const before = fs.readdirSync(os.tmpdir()).filter(name => name.startsWith('anki-apkg-'));
    legacy();
    const after = fs.readdirSync(os.tmpdir()).filter(name => name.startsWith('anki-apkg-'));
    expect(after.length).toBeLessThanOrEqual(before.length);
  });
});
