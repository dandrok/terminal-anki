import { diacritic, ROWCOLUMN_DIACRITICS } from './diacritics.js';

/**
 * Kitty's graphics protocol, via unicode placeholders.
 *
 * The obvious approach — writing a `\x1b_Ga=T…` escape into the output — cannot
 * work inside Ink. Ink measures every string with `string-width` to lay the
 * frame out, and a graphics escape is not an ANSI sequence it knows to skip: a
 * short one measures as twenty-odd visible columns and the layout collapses.
 *
 * Unicode placeholders exist for exactly this. The image is transmitted once
 * and given a *virtual* placement, then drawn as a grid of U+10EEEE characters
 * carrying row and column diacritics, with the image id encoded in the
 * foreground colour. Those are ordinary characters: `string-width` measures each
 * cell as 1, so Ink lays them out like any other text and the terminal
 * substitutes the picture underneath.
 */

/**
 * Written as an escape, not the byte itself.
 *
 * A literal control character in source is invisible in an editor and does
 * not survive a careless reformat.
 */
const ESC = '\u001B';
const START = `${ESC}_G`;
const END = `${ESC}\\`;

/** The placeholder character the terminal replaces with image content. */
export const PLACEHOLDER = String.fromCodePoint(0x10eeee);

/**
 * Payload bytes per escape sequence.
 *
 * The protocol requires chunking beyond this; terminals are entitled to reject
 * anything larger.
 */
export const CHUNK_SIZE = 4096;

/** How many cells an image can span, limited by the diacritic table. */
export const MAX_CELLS = ROWCOLUMN_DIACRITICS.length;

export interface TransmitOptions {
  /** Identifies the image for later placement. Must be positive. */
  id: number;
  /** The encoded file itself — PNG, JPEG, GIF — not raw pixels. */
  data: Buffer;
}

/**
 * Escapes that hand the image to the terminal without displaying it.
 *
 * `f=100` means "this is an encoded file, work out the format yourself", which
 * is why no image decoding is needed on our side. `q=2` suppresses the
 * terminal's replies: they would arrive on stdin and Ink would read them as
 * keystrokes.
 */
export function transmitSequences({ id, data }: TransmitOptions): string[] {
  const payload = data.toString('base64');
  const sequences: string[] = [];

  for (let at = 0; at < payload.length; at += CHUNK_SIZE) {
    const chunk = payload.slice(at, at + CHUNK_SIZE);
    const more = at + CHUNK_SIZE < payload.length ? 1 : 0;

    // Only the first chunk carries the full control block; the rest need just
    // the continuation flag.
    const controls = at === 0 ? `a=t,q=2,f=100,t=d,i=${id},m=${more}` : `q=2,i=${id},m=${more}`;

    sequences.push(`${START}${controls};${chunk}${END}`);
  }

  return sequences;
}

/**
 * The escape that reserves a `columns` x `rows` area for an image.
 *
 * `U=1` makes the placement virtual: nothing is drawn until placeholder
 * characters appear, which is what lets the image live inside a rendered frame
 * rather than being painted over it.
 */
export function virtualPlacement(id: number, columns: number, rows: number): string {
  return `${START}a=p,U=1,q=2,i=${id},c=${columns},r=${rows}${END}`;
}

/** The escape that forgets an image the terminal is still holding. */
export function deleteImage(id: number): string {
  return `${START}a=d,d=I,q=2,i=${id}${END}`;
}

/**
 * Encode an image id as a 24-bit foreground colour.
 *
 * The protocol reads the id out of the cell's colour, so the id and the colour
 * are the same number. Ids are kept under 2^24 for this reason.
 */
export function idToForeground(id: number): string {
  const red = (id >> 16) & 0xff;
  const green = (id >> 8) & 0xff;
  const blue = id & 0xff;
  return `${ESC}[38;2;${red};${green};${blue}m`;
}

const RESET_FOREGROUND = `${ESC}[39m`;

export interface PlaceholderOptions {
  id: number;
  columns: number;
  rows: number;
}

/**
 * The grid of placeholder characters that displays a placed image.
 *
 * Returned as one string per row so the caller can put each in its own `<Text>`
 * and let Ink stack them. Every cell carries both diacritics rather than
 * relying on the terminal's run-length inference: the inference depends on
 * neighbouring cells being emitted in order, which a renderer that repaints
 * arbitrary regions cannot promise.
 */
export function placeholderRows({ id, columns, rows }: PlaceholderOptions): string[] {
  const width = Math.max(0, Math.min(Math.trunc(columns), MAX_CELLS));
  const height = Math.max(0, Math.min(Math.trunc(rows), MAX_CELLS));
  const colour = idToForeground(id);

  const lines: string[] = [];
  for (let row = 0; row < height; row++) {
    const rowMark = diacritic(row);
    if (rowMark === undefined) {
      break;
    }

    let line = colour;
    for (let column = 0; column < width; column++) {
      const columnMark = diacritic(column);
      if (columnMark === undefined) {
        break;
      }
      line += `${PLACEHOLDER}${rowMark}${columnMark}`;
    }
    lines.push(line + RESET_FOREGROUND);
  }

  return lines;
}

/**
 * Fit an image into the space available, keeping its shape.
 *
 * Terminal cells are roughly twice as tall as they are wide, so a square image
 * needs half as many rows as columns or it comes out stretched. The ratio is
 * assumed rather than measured: the escape that reports cell size is not worth
 * a round trip on stdin, which Ink is reading for keystrokes.
 */
export const CELL_ASPECT = 2;

export function fitCells(
  pixelWidth: number,
  pixelHeight: number,
  maxColumns: number,
  maxRows: number
): { columns: number; rows: number } {
  const columns = Math.max(1, Math.min(Math.trunc(maxColumns), MAX_CELLS));
  const rows = Math.max(1, Math.min(Math.trunc(maxRows), MAX_CELLS));

  if (pixelWidth <= 0 || pixelHeight <= 0) {
    return { columns, rows };
  }

  const wanted = Math.max(1, Math.round((pixelHeight / pixelWidth) * (columns / CELL_ASPECT)));
  if (wanted <= rows) {
    return { columns, rows: wanted };
  }

  // Too tall for the space: fit the height instead and narrow to match.
  return {
    columns: Math.max(1, Math.round((pixelWidth / pixelHeight) * rows * CELL_ASPECT)),
    rows
  };
}
