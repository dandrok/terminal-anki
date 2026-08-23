import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { imagePixelSize, pixelSizeOf } from '../../../src/ui/images/size.js';

let workspace: string;

beforeEach(() => {
  workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'anki-size-'));
});

afterEach(() => {
  fs.rmSync(workspace, { recursive: true, force: true });
});

/** A PNG header declaring the given dimensions. Nothing decodes it. */
function png(width: number, height: number): Buffer {
  const data = Buffer.alloc(24);
  data.writeUInt32BE(0x89504e47, 0);
  data.writeUInt32BE(0x0d0a1a0a, 4);
  data.writeUInt32BE(13, 8);
  data.write('IHDR', 12, 'ascii');
  data.writeUInt32BE(width, 16);
  data.writeUInt32BE(height, 20);
  return data;
}

function gif(width: number, height: number): Buffer {
  const data = Buffer.alloc(13);
  data.write('GIF89a', 0, 'ascii');
  data.writeUInt16LE(width, 6);
  data.writeUInt16LE(height, 8);
  return data;
}

/**
 * SOI, a JFIF APP0 that must be skipped, then the SOF0 carrying the size.
 *
 * The length field counts itself and the payload but not the marker, which is
 * exactly the arithmetic the parser has to get right.
 */
function jpeg(width: number, height: number, extra: Buffer = Buffer.alloc(0)): Buffer {
  const app0Payload = Buffer.concat([Buffer.from('JFIF\0', 'ascii'), Buffer.alloc(9)]);
  const app0 = Buffer.concat([
    Buffer.from([0xff, 0xe0]),
    Buffer.from([0x00, app0Payload.length + 2]),
    app0Payload
  ]);

  // SOF0 payload: precision, height, width, component count.
  const sofPayload = Buffer.alloc(7);
  sofPayload.writeUInt8(8, 0);
  sofPayload.writeUInt16BE(height, 1);
  sofPayload.writeUInt16BE(width, 3);
  sofPayload.writeUInt8(3, 5);
  const sof = Buffer.concat([
    Buffer.from([0xff, 0xc0]),
    Buffer.from([0x00, sofPayload.length + 2]),
    sofPayload
  ]);

  return Buffer.concat([Buffer.from([0xff, 0xd8]), app0, extra, sof]);
}

function bmp(width: number, height: number): Buffer {
  const data = Buffer.alloc(26);
  data.write('BM', 0, 'ascii');
  data.writeInt32LE(width, 18);
  data.writeInt32LE(height, 22);
  return data;
}

/** A WebP container of the given flavour. */
function webp(kind: 'VP8X' | 'VP8 ' | 'VP8L', width: number, height: number): Buffer {
  const data = Buffer.alloc(32);
  data.write('RIFF', 0, 'ascii');
  data.write('WEBP', 8, 'ascii');
  data.write(kind, 12, 'ascii');

  if (kind === 'VP8X') {
    // Three bytes each, stored one less than the real size.
    data.writeUIntLE(width - 1, 24, 3);
    data.writeUIntLE(height - 1, 27, 3);
  } else if (kind === 'VP8 ') {
    data.writeUInt16LE(width, 26);
    data.writeUInt16LE(height, 28);
  } else {
    data.writeUInt32LE((width - 1) | ((height - 1) << 14), 21);
  }
  return data;
}

describe('pixelSizeOf', () => {
  it.each([
    ['png', png(240, 160)],
    ['gif', gif(240, 160)],
    ['jpeg', jpeg(240, 160)],
    ['bmp', bmp(240, 160)]
  ])('reads %s dimensions from the header alone', (_format, data) => {
    expect(pixelSizeOf(data)).toEqual({ width: 240, height: 160 });
  });

  it.each(['VP8X', 'VP8 ', 'VP8L'] as const)('reads a %s webp', kind => {
    expect(pixelSizeOf(webp(kind, 240, 160))).toEqual({ width: 240, height: 160 });
  });

  it('ignores a RIFF file that is not a webp', () => {
    const wav = Buffer.alloc(32);
    wav.write('RIFF', 0, 'ascii');
    wav.write('WAVE', 8, 'ascii');
    expect(pixelSizeOf(wav)).toBeUndefined();
  });

  it('reads a bottom-up bitmap, whose height is negative', () => {
    expect(pixelSizeOf(bmp(10, -20))).toEqual({ width: 10, height: 20 });
  });

  it('skips JPEG segments rather than searching for the marker bytes', () => {
    // A comment segment whose payload happens to contain FF C0. Searching for
    // those bytes would read a size out of the middle of a comment; walking the
    // segment chain steps over it.
    const decoy = Buffer.concat([
      Buffer.from([0xff, 0xfe, 0x00, 0x08]),
      Buffer.from([0xff, 0xc0, 0x00, 0x11, 0x08, 0x00])
    ]);
    expect(pixelSizeOf(jpeg(64, 48, decoy))).toEqual({ width: 64, height: 48 });
  });

  it('gives nothing rather than a guess when the segment chain breaks', () => {
    const broken = Buffer.concat([
      Buffer.from([0xff, 0xd8]),
      Buffer.from([0x00, 0x00, 0x00, 0x00])
    ]);
    expect(pixelSizeOf(broken)).toBeUndefined();
  });

  it.each([
    ['empty', Buffer.alloc(0)],
    ['too short', Buffer.from([0x89, 0x50])],
    ['not an image', Buffer.from('just some text')],
    ['a zero-sized png', png(0, 0)]
  ])('gives nothing for %s', (_name, data) => {
    expect(pixelSizeOf(data)).toBeUndefined();
  });
});

describe('imagePixelSize', () => {
  it('reads a file from disk', () => {
    const file = path.join(workspace, 'a.png');
    fs.writeFileSync(file, png(320, 200));
    expect(imagePixelSize(file)).toEqual({ width: 320, height: 200 });
  });

  it('reads only the header, not the whole file', () => {
    // A deck can ship a multi-megabyte photograph on a card.
    const file = path.join(workspace, 'big.png');
    fs.writeFileSync(file, Buffer.concat([png(100, 50), Buffer.alloc(5 * 1024 * 1024)]));
    expect(imagePixelSize(file)).toEqual({ width: 100, height: 50 });
  });

  it('gives nothing for a file that is not there', () => {
    expect(imagePixelSize(path.join(workspace, 'nope.png'))).toBeUndefined();
  });

  it('gives nothing for a directory', () => {
    expect(imagePixelSize(workspace)).toBeUndefined();
  });
});
