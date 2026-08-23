import { describe, expect, it } from 'vitest';
import stringWidth from 'string-width';
import {
  CHUNK_SIZE,
  MAX_CELLS,
  PLACEHOLDER,
  fitCells,
  idToForeground,
  placeholderRows,
  transmitSequences,
  virtualPlacement
} from '../../../src/ui/images/kitty.js';
import { ROWCOLUMN_DIACRITICS, diacritic } from '../../../src/ui/images/diacritics.js';

const ESC = String.fromCharCode(27);
const PNG = Buffer.from('89504e470d0a1a0a', 'hex');

describe('diacritics', () => {
  it('matches the two the protocol documents', () => {
    // U+0305 is row/column 0 and U+030D is 1, per kitty's own example.
    expect(ROWCOLUMN_DIACRITICS[0]).toBe(0x0305);
    expect(ROWCOLUMN_DIACRITICS[1]).toBe(0x030d);
  });

  it('carries the whole table', () => {
    expect(ROWCOLUMN_DIACRITICS).toHaveLength(297);
    expect(new Set(ROWCOLUMN_DIACRITICS).size).toBe(297);
  });

  it('has none for an index past the end', () => {
    expect(diacritic(297)).toBeUndefined();
    expect(diacritic(-1)).toBeUndefined();
  });
});

describe('transmitSequences', () => {
  it('sends a small image in one escape', () => {
    const [only, ...rest] = transmitSequences({ id: 7, data: PNG });
    expect(rest).toHaveLength(0);
    expect(only.startsWith(`${ESC}_Ga=t,q=2,f=100,t=d,i=7,m=0;`)).toBe(true);
    expect(only.endsWith(`${ESC}\\`)).toBe(true);
  });

  it('carries the file itself, base64, not raw pixels', () => {
    // f=100 means "an encoded file" — which is why no decoder is needed here.
    const [only] = transmitSequences({ id: 1, data: PNG });
    expect(only).toContain(PNG.toString('base64'));
  });

  it('chunks a large image and flags every chunk but the last', () => {
    const big = Buffer.alloc(CHUNK_SIZE * 3);
    const sequences = transmitSequences({ id: 2, data: big });
    expect(sequences.length).toBeGreaterThan(1);

    for (const sequence of sequences.slice(0, -1)) {
      expect(sequence).toContain('m=1');
    }
    expect(sequences.at(-1)).toContain('m=0');
  });

  it('repeats only the id and the flag on continuation chunks', () => {
    const sequences = transmitSequences({ id: 3, data: Buffer.alloc(CHUNK_SIZE * 2) });
    expect(sequences[1]).not.toContain('a=t');
    expect(sequences[1]).toContain('i=3');
  });

  it('silences the terminal, which would otherwise reply on stdin', () => {
    // Ink is holding stdin open for keystrokes; a reply would arrive as one.
    for (const sequence of transmitSequences({ id: 4, data: Buffer.alloc(CHUNK_SIZE * 2) })) {
      expect(sequence).toContain('q=2');
    }
  });
});

describe('virtualPlacement', () => {
  it('reserves a cell area without drawing anything', () => {
    // U=1 is what keeps the image inside the frame rather than painted over it.
    expect(virtualPlacement(9, 20, 8)).toBe(`${ESC}_Ga=p,U=1,q=2,i=9,c=20,r=8${ESC}\\`);
  });
});

describe('idToForeground', () => {
  it('encodes the id as a 24-bit colour, because that is where it is read from', () => {
    expect(idToForeground(0x123456)).toBe(`${ESC}[38;2;18;52;86m`);
  });

  it('round-trips through the colour channels', () => {
    for (const id of [1, 255, 256, 0xa000, 0xffffff]) {
      const [, r, g, b] = /38;2;(\d+);(\d+);(\d+)m/.exec(idToForeground(id))!.map(Number);
      expect((r << 16) | (g << 8) | b).toBe(id);
    }
  });
});

describe('placeholderRows', () => {
  it('draws one row per terminal line', () => {
    expect(placeholderRows({ id: 1, columns: 10, rows: 4 })).toHaveLength(4);
  });

  it('measures as exactly the cells it occupies', () => {
    // The whole reason placeholders are used instead of a graphics escape:
    // Ink measures with string-width, and this has to come out right or the
    // layout collapses around it.
    for (const columns of [1, 5, 20, 60]) {
      const [row] = placeholderRows({ id: 1, columns, rows: 1 });
      expect(stringWidth(row)).toBe(columns);
    }
  });

  it('gives every cell both diacritics', () => {
    // Rather than relying on the terminal's run-length inference, which assumes
    // neighbouring cells arrive in order — not something a renderer that
    // repaints arbitrary regions can promise.
    const [row] = placeholderRows({ id: 1, columns: 3, rows: 1 });
    const cells = [...row.matchAll(new RegExp(`${PLACEHOLDER}(.)(.)`, 'gu'))];
    expect(cells).toHaveLength(3);
    expect(cells.map(cell => cell[2])).toEqual([diacritic(0), diacritic(1), diacritic(2)]);
  });

  it('advances the row diacritic down the grid', () => {
    const rows = placeholderRows({ id: 1, columns: 1, rows: 3 });
    expect(rows[0]).toContain(diacritic(0));
    expect(rows[1]).toContain(diacritic(1));
    expect(rows[2]).toContain(diacritic(2));
  });

  it('resets the colour so the id does not leak onto the next text', () => {
    expect(placeholderRows({ id: 1, columns: 2, rows: 1 })[0].endsWith(`${ESC}[39m`)).toBe(true);
  });

  it.each([0, -5])('draws nothing for %i rows', rows => {
    expect(placeholderRows({ id: 1, columns: 10, rows })).toEqual([]);
  });

  it('stops at the size the diacritic table allows', () => {
    const rows = placeholderRows({ id: 1, columns: MAX_CELLS + 50, rows: MAX_CELLS + 50 });
    expect(rows).toHaveLength(MAX_CELLS);
    expect(stringWidth(rows[0])).toBe(MAX_CELLS);
  });
});

describe('fitCells', () => {
  it('halves the rows, because a cell is twice as tall as it is wide', () => {
    // A square image in a square cell grid would come out stretched.
    expect(fitCells(100, 100, 40, 40)).toEqual({ columns: 40, rows: 20 });
  });

  it('keeps a wide image wide', () => {
    expect(fitCells(240, 160, 40, 40)).toEqual({ columns: 40, rows: 13 });
  });

  it('fits the height when the width would overflow it', () => {
    const fitted = fitCells(240, 160, 40, 12);
    expect(fitted.rows).toBe(12);
    expect(fitted.columns).toBe(36);
  });

  it('never exceeds the space it was given', () => {
    for (const [w, h] of [
      [10, 1000],
      [1000, 10],
      [1, 1],
      [3000, 2000]
    ]) {
      const fitted = fitCells(w, h, 30, 10);
      expect(fitted.columns).toBeLessThanOrEqual(30);
      expect(fitted.rows).toBeLessThanOrEqual(10);
      expect(fitted.columns).toBeGreaterThanOrEqual(1);
      expect(fitted.rows).toBeGreaterThanOrEqual(1);
    }
  });

  it('falls back to the whole box when the size is unknown', () => {
    expect(fitCells(0, 0, 24, 8)).toEqual({ columns: 24, rows: 8 });
  });
});
