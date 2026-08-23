import zlib from 'node:zlib';

/**
 * Just enough ZIP to read an Anki package.
 *
 * A dependency would be the obvious answer, but this project ships with two
 * runtime dependencies and reading a zip is a few hundred lines of well-defined
 * structure — Node already provides the only hard part, which is inflate.
 *
 * Reads the central directory rather than scanning for local headers, because
 * the local header's sizes may be zero when the writer streamed the entry and
 * put the real values in a trailing data descriptor. The central directory
 * always has them.
 */

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const LOCAL_SIGNATURE = 0x04034b50;
const ZIP64_LOCATOR_SIGNATURE = 0x07064b50;

/** Compression methods worth supporting: everything else is vanishingly rare. */
const STORED = 0;
const DEFLATED = 8;

/** A zip comment can be this long, so the record is not simply at the end. */
const MAX_COMMENT = 0xffff;

/** Sentinel meaning "the real value is in a zip64 extra field". */
const ZIP64_MARKER = 0xffffffff;

export interface ZipEntry {
  name: string;
  compressionMethod: number;
  compressedSize: number;
  uncompressedSize: number;
  crc32: number;
  /** Offset of the local file header. */
  offset: number;
}

export class ZipError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ZipError';
  }
}

/** Find the End of Central Directory record, searching back past any comment. */
function findEndOfCentralDirectory(buffer: Buffer): number {
  const earliest = Math.max(0, buffer.length - MAX_COMMENT - 22);
  for (let at = buffer.length - 22; at >= earliest; at--) {
    if (buffer.readUInt32LE(at) === EOCD_SIGNATURE) {
      return at;
    }
  }
  throw new ZipError('not a zip file (no end-of-central-directory record)');
}

/**
 * List what a zip contains, without decompressing anything.
 *
 * Entry names are returned exactly as stored. Callers must not use them as
 * paths without checking them — see `isSafeEntryName`.
 */
export function readEntries(buffer: Buffer): ZipEntry[] {
  if (buffer.length < 22) {
    throw new ZipError('file is too small to be a zip');
  }

  const eocd = findEndOfCentralDirectory(buffer);

  const entryCount = buffer.readUInt16LE(eocd + 10);
  const directorySize = buffer.readUInt32LE(eocd + 12);
  const directoryOffset = buffer.readUInt32LE(eocd + 16);

  // Zip64 is a different container. Saying so beats reading garbage offsets.
  if (directoryOffset === ZIP64_MARKER || entryCount === 0xffff) {
    throw new ZipError('zip64 archives are not supported (the file is very large)');
  }
  if (eocd >= 20 && buffer.readUInt32LE(eocd - 20) === ZIP64_LOCATOR_SIGNATURE) {
    throw new ZipError('zip64 archives are not supported (the file is very large)');
  }
  if (directoryOffset + directorySize > buffer.length) {
    throw new ZipError('zip directory runs past the end of the file (truncated?)');
  }

  const entries: ZipEntry[] = [];
  let at = directoryOffset;

  for (let index = 0; index < entryCount; index++) {
    if (at + 46 > buffer.length || buffer.readUInt32LE(at) !== CENTRAL_SIGNATURE) {
      throw new ZipError(`zip directory entry ${index} is malformed`);
    }

    const nameLength = buffer.readUInt16LE(at + 28);
    const extraLength = buffer.readUInt16LE(at + 30);
    const commentLength = buffer.readUInt16LE(at + 32);

    const compressedSize = buffer.readUInt32LE(at + 20);
    const uncompressedSize = buffer.readUInt32LE(at + 24);
    if (compressedSize === ZIP64_MARKER || uncompressedSize === ZIP64_MARKER) {
      throw new ZipError('zip64 entry sizes are not supported (the file is very large)');
    }

    entries.push({
      name: buffer.toString('utf-8', at + 46, at + 46 + nameLength),
      compressionMethod: buffer.readUInt16LE(at + 10),
      crc32: buffer.readUInt32LE(at + 16),
      compressedSize,
      uncompressedSize,
      offset: buffer.readUInt32LE(at + 42)
    });

    at += 46 + nameLength + extraLength + commentLength;
  }

  return entries;
}

/**
 * Decompress one entry.
 *
 * The CRC is checked, because the alternative is handing a silently corrupt
 * SQLite database to the parser and reading whatever comes out.
 */
export function readEntryData(buffer: Buffer, entry: ZipEntry): Buffer {
  const { offset } = entry;
  if (offset + 30 > buffer.length || buffer.readUInt32LE(offset) !== LOCAL_SIGNATURE) {
    throw new ZipError(`${entry.name}: local header is missing or malformed`);
  }

  // The local header's own name and extra lengths, which need not match the
  // central directory's: writers pad the extra field differently in each.
  const nameLength = buffer.readUInt16LE(offset + 26);
  const extraLength = buffer.readUInt16LE(offset + 28);
  const start = offset + 30 + nameLength + extraLength;
  const end = start + entry.compressedSize;

  if (end > buffer.length) {
    throw new ZipError(`${entry.name}: data runs past the end of the file (truncated?)`);
  }

  const raw = buffer.subarray(start, end);

  let data: Buffer;
  switch (entry.compressionMethod) {
    case STORED:
      data = Buffer.from(raw);
      break;
    case DEFLATED:
      try {
        // Bounded by what the directory says the entry expands to. A zip bomb
        // declares a tiny compressed size and inflates to gigabytes; without a
        // limit the process is out of memory before the size check below ever
        // runs.
        data = zlib.inflateRawSync(raw, { maxOutputLength: entry.uncompressedSize });
      } catch (error) {
        throw new ZipError(
          `${entry.name}: could not decompress (${error instanceof Error ? error.message : String(error)})`
        );
      }
      break;
    default:
      throw new ZipError(
        `${entry.name}: unsupported compression method ${entry.compressionMethod}`
      );
  }

  if (data.length !== entry.uncompressedSize) {
    throw new ZipError(
      `${entry.name}: expected ${entry.uncompressedSize} bytes but got ${data.length}`
    );
  }
  if (zlib.crc32(data) !== entry.crc32) {
    throw new ZipError(`${entry.name}: checksum mismatch (the file is damaged)`);
  }

  return data;
}

/**
 * Whether an entry name is safe to use as a path component.
 *
 * A zip can name an entry `../../.ssh/authorized_keys`, and extracting it
 * verbatim writes wherever that resolves to. Anki's own entries are a fixed set
 * of names and plain numbers, so nothing legitimate is lost by being strict.
 */
export function isSafeEntryName(name: string): boolean {
  if (name === '' || name.length > 255) {
    return false;
  }
  // Backslashes as well: a Windows-written zip can use them as separators, and
  // a name that is harmless on Linux may not be elsewhere.
  if (name.includes('/') || name.includes('\\') || name.includes('\0')) {
    return false;
  }
  return name !== '.' && name !== '..';
}

/** Read a zip into a map of name to entry, keeping the last of any duplicate. */
export function indexEntries(entries: readonly ZipEntry[]): Map<string, ZipEntry> {
  return new Map(entries.map(entry => [entry.name, entry]));
}
