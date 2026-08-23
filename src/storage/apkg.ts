import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { DatabaseSync } from 'node:sqlite';
import { indexEntries, isSafeEntryName, readEntries, readEntryData, ZipError } from './zip.js';
import type { ImportedNote } from '../core/import.js';

/**
 * Reading an Anki deck package.
 *
 * An `.apkg` is a zip holding a SQLite collection plus numbered media files.
 * Everything needed to read one is already in Node: `node:sqlite` opens the
 * collection and `zlib` handles both the zip's deflate and the newer format's
 * zstd, so this costs no dependencies.
 *
 * Note types are never parsed. In the modern format they are protobuf blobs,
 * and skipping them removes the largest chunk of work for nothing lost:
 *
 *   - field values come from `notes.flds`, split on 0x1f
 *   - whether a note is cloze is visible in its text (`{{c1::…}}`)
 *   - whether it has a reverse card is `COUNT(DISTINCT ord)` over its cards
 *
 * so the note type itself never has to be understood.
 */

/** Collection entries, newest format first. */
const COLLECTIONS: readonly { name: string; zstd: boolean }[] = [
  { name: 'collection.anki21b', zstd: true },
  { name: 'collection.anki21', zstd: false },
  { name: 'collection.anki2', zstd: false }
];

/**
 * Anki joins a note's fields with the unit separator.
 *
 * Written as an escape rather than the byte itself: a literal 0x1f in source
 * is invisible in an editor and survives exactly until somebody reformats it.
 */
const FIELD_SEPARATOR = '\u001F';

/** `cards.factor` is the easiness factor times a thousand. */
const FACTOR_SCALE = 1000;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** A due day beyond this is not a date, it is a corrupt or relative value. */
const MAX_DUE_DAYS = 100_000;

/** zstd frames start with this magic number. */
const ZSTD_MAGIC = 0xfd2fb528;

/**
 * Ceiling on anything zstd expands to.
 *
 * Unlike a zip entry, a zstd frame carries no trustworthy declared size, so
 * there is nothing to bound it by except a policy. 512 MB is far past any real
 * collection — the largest shared decks are tens of megabytes — while still
 * stopping a package crafted to expand until the process dies.
 */
const MAX_DECOMPRESSED = 512 * 1024 * 1024;

export class ApkgError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApkgError';
  }
}

export interface ApkgDeck {
  notes: ImportedNote[];
  /** The deck's own name, when the collection records one. */
  deckName?: string;
  /** Original media filename to its contents. */
  media: Map<string, Buffer>;
  /** Which collection entry was read, for the report. */
  format: string;
}

interface NoteRow {
  id: number;
  guid: string;
  tags: string;
  flds: string;
}

interface CardRow {
  nid: number;
  cards: number;
  ivl: number;
  factor: number;
  reps: number;
  due: number;
  did: number;
}

function looksLikeZstd(data: Buffer): boolean {
  return data.length >= 4 && data.readUInt32LE(0) === ZSTD_MAGIC;
}

function unzstd(data: Buffer): Buffer {
  try {
    return Buffer.from(zlib.zstdDecompressSync(data, { maxOutputLength: MAX_DECOMPRESSED }));
  } catch (error) {
    throw new ApkgError(
      `could not decompress the collection (${error instanceof Error ? error.message : String(error)})`
    );
  }
}

/** Read a protobuf varint, advancing the cursor. */
function readVarint(data: Buffer, cursor: { at: number }): number {
  let result = 0;
  let shift = 0;
  while (cursor.at < data.length) {
    const byte = data[cursor.at++];
    // Arithmetic rather than bit shifts: `<<` is 32-bit in JavaScript and a
    // large field length would silently wrap to a negative number.
    result += (byte & 0x7f) * 2 ** shift;
    if ((byte & 0x80) === 0) {
      break;
    }
    shift += 7;
  }
  return result;
}

/**
 * Read the `name` out of one `MediaEntry { string name = 1; … }`.
 *
 * Only the name is wanted; size and sha1 are walked past by the same loop.
 */
function readEntryName(entry: Buffer): string | undefined {
  const cursor = { at: 0 };
  let name: string | undefined;

  while (cursor.at < entry.length) {
    const tag = readVarint(entry, cursor);
    const field = tag >> 3;
    const wire = tag & 0x07;

    if (wire === 2) {
      const length = readVarint(entry, cursor);
      if (field === 1) {
        name = entry.toString('utf-8', cursor.at, cursor.at + length);
      }
      cursor.at += length;
      continue;
    }
    if (wire === 0) {
      readVarint(entry, cursor);
      continue;
    }
    // A wire type this message does not use: stop rather than guess.
    break;
  }

  return name;
}

/**
 * Read the media map: which numbered zip entry holds which original filename.
 *
 * Two formats. Legacy packages write JSON; 2.1.50 onwards writes a zstd-
 * compressed protobuf. Only one flat message shape is involved, so it is read
 * by hand rather than pulling in a protobuf runtime for a list of names.
 */
export function readMediaMap(data: Buffer): Map<string, string> {
  const names = new Map<string, string>();
  if (data.length === 0) {
    return names;
  }

  if (data[0] === 0x7b) {
    // '{' — the legacy JSON map, keyed by the entry number as a string.
    const parsed: unknown = JSON.parse(data.toString('utf-8'));
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
        if (typeof value === 'string') {
          names.set(key, value);
        }
      }
    }
    return names;
  }

  // MediaEntries { repeated MediaEntry entries = 1; }
  // The entries are positional: the nth is the file named "n" in the zip.
  const body = looksLikeZstd(data) ? unzstd(data) : data;
  const cursor = { at: 0 };
  let position = 0;

  while (cursor.at < body.length) {
    const tag = readVarint(body, cursor);
    if (tag >> 3 !== 1 || (tag & 0x07) !== 2) {
      break;
    }
    const length = readVarint(body, cursor);
    const name = readEntryName(body.subarray(cursor.at, cursor.at + length));
    cursor.at += length;

    if (name) {
      names.set(String(position), name);
    }
    position++;
  }

  return names;
}

/**
 * Every deck in the collection, by id.
 *
 * The whole map rather than one name: a package holds a deck tree, and each
 * note has to be tagged with the deck it is actually in.
 */
function readDeckNames(db: DatabaseSync): Map<number, string> {
  const decks = new Map<number, string>();

  // Schema 18 keeps decks in their own table with a plain name column.
  try {
    const rows = db.prepare('SELECT id, name FROM decks').all() as unknown as {
      id: number;
      name: string;
    }[];
    for (const row of rows) {
      if (typeof row.name === 'string' && row.name) {
        // Sub-decks are separated by 0x1f there and by "::" before it.
        decks.set(Number(row.id), row.name.split(FIELD_SEPARATOR).join('::'));
      }
    }
    if (decks.size > 0) {
      return decks;
    }
  } catch {
    // No such table, so this is an older schema; the JSON below applies.
  }

  try {
    const row = db.prepare('SELECT decks FROM col LIMIT 1').get() as { decks?: string } | undefined;
    if (!row?.decks) {
      return decks;
    }
    const parsed = JSON.parse(row.decks) as Record<string, { name?: string }>;
    for (const [id, deck] of Object.entries(parsed)) {
      if (typeof deck?.name === 'string' && deck.name) {
        decks.set(Number(id), deck.name);
      }
    }
  } catch {
    // A decks blob we cannot parse costs the tags, not the deck.
  }

  return decks;
}

/**
 * The deck a note belongs in, as a tag.
 *
 * "Default" is dropped: every collection has it, nobody chose it, and tagging
 * half an import with it says nothing about those cards.
 */
function deckTag(decks: Map<number, string>, did: number | undefined): string | undefined {
  const name = did === undefined ? undefined : decks.get(did);
  return name && name !== 'Default' ? name : undefined;
}

/** When the collection was created, which `cards.due` counts days from. */
function readCreatedAt(db: DatabaseSync): Date | undefined {
  try {
    const row = db.prepare('SELECT crt FROM col LIMIT 1').get() as { crt?: number } | undefined;
    return typeof row?.crt === 'number' && row.crt > 0 ? new Date(row.crt * 1000) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Translate Anki's scheduling into ours.
 *
 * The two line up closely enough to carry across, so an imported deck keeps the
 * progress made on it rather than resetting every card to new.
 */
function toScheduling(
  card: CardRow | undefined,
  createdAt: Date | undefined
): ImportedNote['scheduling'] {
  // A card still in learning has its interval in seconds, written as a negative
  // number, and no meaningful day interval to keep. Those arrive as new.
  if (!card || card.ivl <= 0 || card.reps <= 0) {
    return undefined;
  }

  const easiness = card.factor > 0 ? card.factor / FACTOR_SCALE : undefined;
  const nextReview =
    createdAt && card.due > 0 && card.due < MAX_DUE_DAYS
      ? new Date(createdAt.getTime() + card.due * MS_PER_DAY)
      : undefined;

  return {
    interval: card.ivl,
    repetitions: card.reps,
    ...(easiness !== undefined ? { easiness } : {}),
    ...(nextReview ? { nextReview } : {})
  };
}

/** Open a collection buffer as a database, via a temp file, and clean up. */
function withDatabase<T>(collection: Buffer, run: (db: DatabaseSync) => T): T {
  // DatabaseSync takes a path rather than a buffer, so the collection has to
  // land on disk. It goes to the system temp directory and is removed either
  // way — including when the caller throws.
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'anki-apkg-'));
  const file = path.join(directory, 'collection.anki2');

  try {
    fs.writeFileSync(file, collection);
    const db = new DatabaseSync(file, { readOnly: true });
    try {
      return run(db);
    } finally {
      db.close();
    }
  } catch (error) {
    if (error instanceof ApkgError) {
      throw error;
    }
    throw new ApkgError(
      `could not read the collection (${error instanceof Error ? error.message : String(error)})`
    );
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

/** Read a `.apkg` into notes and media. Writes nothing. */
export function readApkg(file: string): ApkgDeck {
  let buffer: Buffer;
  try {
    buffer = fs.readFileSync(file);
  } catch (error) {
    throw new ApkgError(
      `could not read ${file} (${error instanceof Error ? error.message : String(error)})`
    );
  }

  let byName: Map<string, ReturnType<typeof readEntries>[number]>;
  try {
    byName = indexEntries(readEntries(buffer));
  } catch (error) {
    throw new ApkgError(
      error instanceof ZipError ? error.message : `could not open the package (${String(error)})`
    );
  }

  const found = COLLECTIONS.find(candidate => byName.has(candidate.name));
  if (!found) {
    const listed = [...byName.keys()].slice(0, 6).join(', ');
    throw new ApkgError(
      `no Anki collection inside the package (it contains: ${listed || 'nothing'})`
    );
  }

  const entry = byName.get(found.name);
  if (!entry) {
    throw new ApkgError(`${found.name} vanished from the package`);
  }

  let collection: Buffer;
  try {
    collection = readEntryData(buffer, entry);
  } catch (error) {
    throw new ApkgError(error instanceof ZipError ? error.message : String(error));
  }
  if (found.zstd) {
    collection = unzstd(collection);
  }

  const { notes, deckName } = withDatabase(collection, db => {
    const decks = readDeckNames(db);
    const noteRows = db
      .prepare('SELECT id, guid, tags, flds FROM notes')
      .all() as unknown as NoteRow[];

    // One query for every note's card facts rather than one per note: a big
    // deck has tens of thousands of notes.
    //
    // Every scheduling value comes from the *same* card — the lowest `ord`,
    // which is the forward card and the only one imported. Aggregating each
    // column separately built a schedule out of two different cards: MAX(ivl)
    // from a well-drilled reverse card beside MIN(due) from the forward one.
    const cardRows = db
      .prepare(
        `SELECT c.nid, n.cards, c.ivl, c.factor, c.reps, c.due, c.did
         FROM cards c
         JOIN (SELECT nid, COUNT(DISTINCT ord) AS cards, MIN(ord) AS lowest
               FROM cards GROUP BY nid) n
           ON n.nid = c.nid AND n.lowest = c.ord
         GROUP BY c.nid`
      )
      .all() as unknown as CardRow[];

    const byNote = new Map(cardRows.map(row => [Number(row.nid), row]));
    const createdAt = readCreatedAt(db);

    const imported: ImportedNote[] = noteRows.map(row => {
      const card = byNote.get(Number(row.id));
      const scheduling = toScheduling(card, createdAt);
      const deck = deckTag(decks, card ? Number(card.did) : undefined);
      return {
        fields: String(row.flds).split(FIELD_SEPARATOR),
        // Anki pads its tag field with a space at each end.
        tags: String(row.tags).trim().split(/\s+/).filter(Boolean),
        guid: String(row.guid),
        ...(card ? { cardCount: card.cards } : {}),
        ...(deck ? { deck } : {}),
        ...(scheduling ? { scheduling } : {})
      };
    });

    // Reported so the summary can name the deck; the tags come from each note.
    const named = [...decks.values()].filter(name => name !== 'Default');
    return { notes: imported, deckName: named[0] };
  });

  return {
    notes,
    media: readMedia(buffer, byName),
    format: found.name,
    ...(deckName ? { deckName } : {})
  };
}

/** Media entries are numbered; the map says which number is which name. */
function readMedia(
  buffer: Buffer,
  byName: Map<string, ReturnType<typeof readEntries>[number]>
): Map<string, Buffer> {
  const media = new Map<string, Buffer>();
  const mediaEntry = byName.get('media');
  if (!mediaEntry) {
    return media;
  }

  let names: Map<string, string>;
  try {
    names = readMediaMap(readEntryData(buffer, mediaEntry));
  } catch {
    // A media map we cannot read costs the pictures, not the deck.
    return media;
  }

  for (const [number, original] of names) {
    const entry = byName.get(number);
    // The name comes from the package and is about to be used as a filename.
    if (!entry || !isSafeEntryName(original)) {
      continue;
    }
    try {
      const data = readEntryData(buffer, entry);
      media.set(original, looksLikeZstd(data) ? unzstd(data) : data);
    } catch {
      // One unreadable picture must not fail the whole import.
    }
  }

  return media;
}
