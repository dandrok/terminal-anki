/**
 * Build the `.apkg` fixtures the import tests read.
 *
 * Real files rather than hand-written buffers: a synthetic fixture that does
 * not match what Anki actually writes is worse than no test at all, because it
 * passes while the real thing fails.
 *
 * Run with `node tests/fixtures/build-apkg.mjs`. The output is committed, so
 * the suite does not depend on this script — it exists so the fixtures can be
 * rebuilt and audited rather than being opaque binaries.
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const US = '\x1f';

/** A 1x1 transparent PNG, so the fixture ships a real image. */
const PNG = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489' +
    '0000000a49444154789c636000000200010005fe02fea7c2b4bb0000000049454e44ae426082',
  'hex'
);

const LEGACY_SCHEMA = `
CREATE TABLE col (id integer primary key, crt integer not null, mod integer not null,
  scm integer not null, ver integer not null, dty integer not null, usn integer not null,
  ls integer not null, conf text not null, models text not null, decks text not null,
  tags text not null);
CREATE TABLE notes (id integer primary key, guid text not null, mid integer not null,
  mod integer not null, usn integer not null, tags text not null, flds text not null,
  sfld integer not null, csum integer not null, flags integer not null, data text not null);
CREATE TABLE cards (id integer primary key, nid integer not null, did integer not null,
  ord integer not null, mod integer not null, usn integer not null, type integer not null,
  queue integer not null, due integer not null, ivl integer not null, factor integer not null,
  reps integer not null, lapses integer not null, left integer not null, odue integer not null,
  odid integer not null, flags integer not null, data text not null);
`;

/** 2026-01-01, so `cards.due` day offsets land on predictable dates. */
const CREATED_AT = Math.floor(Date.UTC(2026, 0, 1) / 1000);

const NOTES = [
  // id, guid, mid, tags, fields
  [1, 'guid-basic-1', 1, ' greetings spanish ', ['<b>hola</b>', 'hello']],
  [2, 'guid-basic-2', 1, '', ['el <i>gato</i><br>(animal)', 'the cat']],
  [3, 'guid-image-1', 1, ' anatomy ', ['What is this? <img src="heart.png">', 'A heart']],
  [4, 'guid-rev-1', 2, ' spanish ', ['correr', 'to run']],
  [5, 'guid-cloze-1', 3, '', ['The capital is {{c1::Madrid}}', '']],
  [6, 'guid-audio-1', 1, '', ['escuchar [sound:esc.mp3]', 'to listen']],
  [7, 'guid-empty-1', 1, '', ['', '']]
];

const CARDS = [
  // id, nid, did, ord, type, queue, due, ivl, factor, reps, lapses
  [11, 1, 1600000000, 0, 2, 2, 30, 45, 2650, 7, 1],
  [12, 2, 1600000000, 0, 0, 0, 3, 0, 2500, 0, 0],
  [13, 3, 1, 0, 2, 2, 10, 12, 2300, 3, 0],
  [14, 4, 1, 0, 2, 2, 5, 9, 2500, 2, 0],
  // The reverse card of note 4: same note, second template.
  [15, 4, 1, 1, 0, 0, 6, 0, 2500, 0, 0],
  [16, 5, 1, 0, 0, 0, 7, 0, 2500, 0, 0],
  // Still in learning: a negative interval means seconds, not days.
  [17, 6, 1, 0, 1, 1, 0, -600, 2500, 1, 0],
  [18, 7, 1, 0, 0, 0, 8, 0, 2500, 0, 0]
];

const MODELS = {
  1: { id: 1, name: 'Basic', flds: [{ name: 'Front' }, { name: 'Back' }] },
  2: { id: 2, name: 'Basic (and reversed card)', flds: [{ name: 'Front' }, { name: 'Back' }] },
  3: { id: 3, name: 'Cloze', flds: [{ name: 'Text' }] }
};

const DECKS = {
  1: { id: 1, name: 'Default' },
  1600000000: { id: 1600000000, name: 'Spanish::Verbs' }
};

function buildCollection(target) {
  fs.rmSync(target, { force: true });
  const db = new DatabaseSync(target);
  db.exec(LEGACY_SCHEMA);

  db.prepare(`INSERT INTO col VALUES (1, ?, 0, 0, 11, 0, 0, 0, '{}', ?, ?, '{}')`).run(
    CREATED_AT,
    JSON.stringify(MODELS),
    JSON.stringify(DECKS)
  );

  const note = db.prepare(`INSERT INTO notes VALUES (?, ?, ?, 0, 0, ?, ?, 0, 0, 0, '')`);
  for (const [id, guid, mid, tags, fields] of NOTES) {
    note.run(id, guid, mid, tags, fields.join(US));
  }

  const card = db.prepare(
    `INSERT INTO cards VALUES (?, ?, ?, ?, 0, 0, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0, '')`
  );
  for (const [id, nid, did, ord, type, queue, due, ivl, factor, reps, lapses] of CARDS) {
    card.run(id, nid, did, ord, type, queue, due, ivl, factor, reps, lapses);
  }

  db.close();
}

/** Minimal zip writer: stored entries only, which keeps this readable. */
function writeZip(target, entries) {
  const locals = [];
  const central = [];
  let offset = 0;

  for (const [name, contents] of entries) {
    const nameBytes = Buffer.from(name, 'utf-8');
    const crc = zlib.crc32(contents);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(0, 8); // stored
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(contents.length, 18);
    local.writeUInt32LE(contents.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    locals.push(local, nameBytes, contents);

    const header = Buffer.alloc(46);
    header.writeUInt32LE(0x02014b50, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(20, 6);
    header.writeUInt16LE(0, 10);
    header.writeUInt32LE(crc, 16);
    header.writeUInt32LE(contents.length, 20);
    header.writeUInt32LE(contents.length, 24);
    header.writeUInt16LE(nameBytes.length, 28);
    header.writeUInt32LE(offset, 42);
    central.push(header, nameBytes);

    offset += local.length + nameBytes.length + contents.length;
  }

  const directory = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);

  fs.writeFileSync(target, Buffer.concat([...locals, directory, end]));
}

/** The protobuf MediaEntries message the modern format uses. */
function mediaProtobuf(names) {
  const chunks = [];
  for (const name of names) {
    const nameBytes = Buffer.from(name, 'utf-8');
    // field 1 (name), wire type 2
    const entry = Buffer.concat([Buffer.from([0x0a, nameBytes.length]), nameBytes]);
    // repeated field 1 of MediaEntries, wire type 2
    chunks.push(Buffer.from([0x0a, entry.length]), entry);
  }
  return Buffer.concat(chunks);
}

const collection = path.join(HERE, 'collection.tmp');
buildCollection(collection);
const collectionBytes = fs.readFileSync(collection);
fs.rmSync(collection, { force: true });

// Legacy: plain SQLite, JSON media map, raw media files.
writeZip(path.join(HERE, 'legacy.apkg'), [
  ['collection.anki2', collectionBytes],
  ['media', Buffer.from(JSON.stringify({ 0: 'heart.png' }), 'utf-8')],
  ['0', PNG]
]);

// Modern: zstd SQLite, zstd protobuf media map, zstd media files.
//
// It also carries a legacy collection.anki2, exactly as Anki writes one for
// backwards compatibility. That is what makes "prefers the newest format" a
// real test rather than a tautology — and reading the wrong one would silently
// drop everything added since the legacy copy was made.
writeZip(path.join(HERE, 'modern.apkg'), [
  ['collection.anki2', Buffer.from('SQLite format 3 - deliberately unreadable stub', 'utf-8')],
  ['collection.anki21b', Buffer.from(zlib.zstdCompressSync(collectionBytes))],
  ['media', Buffer.from(zlib.zstdCompressSync(mediaProtobuf(['heart.png'])))],
  ['0', Buffer.from(zlib.zstdCompressSync(PNG))],
  ['meta', Buffer.from([0x08, 0x03])]
]);

// A package with no collection in it at all.
writeZip(path.join(HERE, 'not-a-deck.apkg'), [['readme.txt', Buffer.from('not a deck', 'utf-8')]]);

for (const name of ['legacy.apkg', 'modern.apkg', 'not-a-deck.apkg']) {
  console.log(name, fs.statSync(path.join(HERE, name)).size, 'bytes');
}
