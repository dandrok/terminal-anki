import fs from 'node:fs';

/**
 * An image's dimensions, read from its header.
 *
 * Only the header: every format writes width and height in the first few dozen
 * bytes, so there is no need to decode a single pixel. Without this an image is
 * drawn into whatever box it is given and comes out stretched, since terminal
 * cells are about twice as tall as they are wide.
 */

export interface PixelSize {
  width: number;
  height: number;
}

/** Enough for a JPEG to reach its first frame marker in nearly every case. */
const HEADER_BYTES = 65536;

function png(data: Buffer): PixelSize | undefined {
  // Signature, then an IHDR chunk whose payload starts at byte 16.
  if (data.length < 24 || data.readUInt32BE(0) !== 0x89504e47) {
    return undefined;
  }
  return { width: data.readUInt32BE(16), height: data.readUInt32BE(20) };
}

function gif(data: Buffer): PixelSize | undefined {
  if (data.length < 10 || data.toString('ascii', 0, 3) !== 'GIF') {
    return undefined;
  }
  return { width: data.readUInt16LE(6), height: data.readUInt16LE(8) };
}

function bmp(data: Buffer): PixelSize | undefined {
  if (data.length < 26 || data.toString('ascii', 0, 2) !== 'BM') {
    return undefined;
  }
  // Height is signed: a negative value means the rows are stored top-down.
  return { width: data.readInt32LE(18), height: Math.abs(data.readInt32LE(22)) };
}

function webp(data: Buffer): PixelSize | undefined {
  if (data.length < 30 || data.toString('ascii', 0, 4) !== 'RIFF') {
    return undefined;
  }
  if (data.toString('ascii', 8, 12) !== 'WEBP') {
    return undefined;
  }

  const chunk = data.toString('ascii', 12, 16);
  if (chunk === 'VP8X') {
    // Three-byte little-endian values, each one less than the real size.
    return {
      width: 1 + data.readUIntLE(24, 3),
      height: 1 + data.readUIntLE(27, 3)
    };
  }
  if (chunk === 'VP8 ') {
    return { width: data.readUInt16LE(26) & 0x3fff, height: data.readUInt16LE(28) & 0x3fff };
  }
  if (chunk === 'VP8L') {
    const bits = data.readUInt32LE(21);
    return { width: 1 + (bits & 0x3fff), height: 1 + ((bits >> 14) & 0x3fff) };
  }
  return undefined;
}

/**
 * JPEG keeps its size in a start-of-frame segment, position unknown.
 *
 * The file is a chain of length-prefixed segments, so the frame marker is found
 * by walking them rather than by searching for the bytes — the same pair can
 * appear inside compressed data and would give a nonsense answer.
 */
function jpeg(data: Buffer): PixelSize | undefined {
  if (data.length < 4 || data.readUInt16BE(0) !== 0xffd8) {
    return undefined;
  }

  let at = 2;
  while (at + 9 < data.length) {
    if (data[at] !== 0xff) {
      // Out of step with the segment chain; anything further would be a guess.
      return undefined;
    }
    const marker = data[at + 1];

    // Padding and standalone markers carry no length field.
    if (marker === 0xff) {
      at += 1;
      continue;
    }
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd9)) {
      at += 2;
      continue;
    }

    const length = data.readUInt16BE(at + 2);
    if (length < 2) {
      return undefined;
    }

    // SOF0-SOF15, excluding the four that are not frame headers.
    const isFrame =
      marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isFrame) {
      return { width: data.readUInt16BE(at + 7), height: data.readUInt16BE(at + 5) };
    }

    at += 2 + length;
  }

  return undefined;
}

const READERS = [png, jpeg, gif, webp, bmp];

/** Dimensions from a buffer, or `undefined` for a format we cannot read. */
export function pixelSizeOf(data: Buffer): PixelSize | undefined {
  for (const read of READERS) {
    const size = read(data);
    // A zero or negative dimension is not a size; treat it as unreadable so the
    // caller falls back to the space it has rather than dividing by it.
    if (size && size.width > 0 && size.height > 0) {
      return size;
    }
  }
  return undefined;
}

/** Dimensions of a file on disk, reading only as much as it takes. */
export function imagePixelSize(file: string): PixelSize | undefined {
  let handle: number | undefined;
  try {
    handle = fs.openSync(file, 'r');
    const buffer = Buffer.alloc(HEADER_BYTES);
    const read = fs.readSync(handle, buffer, 0, HEADER_BYTES, 0);
    return pixelSizeOf(buffer.subarray(0, read));
  } catch {
    return undefined;
  } finally {
    if (handle !== undefined) {
      try {
        fs.closeSync(handle);
      } catch {
        // Nothing useful left to do about a handle that will not close.
      }
    }
  }
}
