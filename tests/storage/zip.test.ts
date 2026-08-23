import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { describe, expect, it } from 'vitest';
import {
  ZipError,
  indexEntries,
  isSafeEntryName,
  readEntries,
  readEntryData
} from '../../src/storage/zip.js';

const FIXTURE = path.join(process.cwd(), 'tests', 'fixtures', 'legacy.apkg');
const zip = () => fs.readFileSync(FIXTURE);

describe('readEntries', () => {
  it('lists what an Anki package contains', () => {
    const names = readEntries(zip()).map(entry => entry.name);
    expect(names).toContain('collection.anki2');
    expect(names).toContain('media');
    expect(names).toContain('0');
  });

  it('records the sizes from the central directory', () => {
    const entry = indexEntries(readEntries(zip())).get('media');
    expect(entry?.uncompressedSize).toBeGreaterThan(0);
  });

  it.each([
    [Buffer.alloc(0), 'too small'],
    [Buffer.alloc(10), 'too small'],
    [Buffer.alloc(200), 'not a zip file']
  ])('refuses input that is not a zip', (buffer, expected) => {
    expect(() => readEntries(buffer)).toThrow(expected);
  });

  it('reports a truncated file rather than reading past the end', () => {
    const truncated = zip().subarray(0, 100);
    expect(() => readEntries(truncated)).toThrow(ZipError);
  });
});

describe('readEntryData', () => {
  it('decompresses an entry', () => {
    const buffer = zip();
    const entry = indexEntries(readEntries(buffer)).get('media');
    expect(entry).toBeDefined();
    expect(JSON.parse(readEntryData(buffer, entry!).toString('utf-8'))).toEqual({
      '0': 'heart.png'
    });
  });

  it('reads a SQLite database out intact', () => {
    const buffer = zip();
    const entry = indexEntries(readEntries(buffer)).get('collection.anki2');
    const data = readEntryData(buffer, entry!);
    expect(data.subarray(0, 15).toString('utf-8')).toBe('SQLite format 3');
  });

  it('catches a damaged entry instead of handing back rubbish', () => {
    // A corrupt SQLite file parsed as if it were fine is far worse than an
    // error saying the download is damaged.
    const buffer = zip();
    const entries = readEntries(buffer);
    const entry = indexEntries(entries).get('media')!;
    const damaged = Buffer.from(buffer);
    // Flip a byte inside the entry's data.
    const at = entry.offset + 30 + entry.name.length + 4;
    damaged[at] = damaged[at] ^ 0xff;

    expect(() => readEntryData(damaged, entry)).toThrow(/checksum|decompress|expected/);
  });

  it('refuses a compression method it does not implement', () => {
    const buffer = zip();
    const entry = indexEntries(readEntries(buffer)).get('media')!;
    expect(() => readEntryData(buffer, { ...entry, compressionMethod: 99 })).toThrow(
      'unsupported compression method 99'
    );
  });

  it('handles a stored (uncompressed) entry', () => {
    // Anki writes some entries stored; the fixtures are built that way.
    const buffer = zip();
    const entries = readEntries(buffer);
    expect(entries.some(entry => entry.compressionMethod === 0)).toBe(true);
  });

  it('handles a deflated entry', () => {
    // Built here rather than assumed, so both branches are covered whatever
    // the fixture happens to use.
    const contents = Buffer.from('x'.repeat(500));
    const deflated = zlib.deflateRawSync(contents);
    const name = Buffer.from('f.txt');

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(8, 8);
    local.writeUInt16LE(name.length, 26);

    const buffer = Buffer.concat([local, name, deflated]);
    const entry = {
      name: 'f.txt',
      compressionMethod: 8,
      compressedSize: deflated.length,
      uncompressedSize: contents.length,
      crc32: zlib.crc32(contents),
      offset: 0
    };
    expect(readEntryData(buffer, entry).equals(contents)).toBe(true);
  });
});

describe('isSafeEntryName', () => {
  it.each(['0', '12', 'collection.anki2', 'media', 'heart.png'])('accepts %j', name => {
    expect(isSafeEntryName(name)).toBe(true);
  });

  it.each(['../../etc/passwd', '/etc/passwd', 'a/b.png', 'a\\b.png', '..', '.', '', 'a\u0000b'])(
    'rejects %j',
    name => {
      // A zip can name an entry anything; extracting one verbatim writes wherever
      // it resolves to.
      expect(isSafeEntryName(name)).toBe(false);
    }
  );

  it('rejects an absurdly long name', () => {
    expect(isSafeEntryName('a'.repeat(300))).toBe(false);
  });
});
