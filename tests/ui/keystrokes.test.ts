import { describe, expect, it } from 'vitest';
import { isConfirm, splitKeystrokes } from '../../src/ui/keystrokes.js';

const ESC = String.fromCharCode(27);

describe('splitKeystrokes', () => {
  it('passes a single character through', () => {
    expect(splitKeystrokes('3')).toEqual(['3']);
  });

  it('splits a chunk that arrived in one read', () => {
    // Typing quickly — which two-keystroke grading actively encourages —
    // delivers " 3" rather than " " then "3". Comparing the whole string
    // against single characters silently dropped both.
    expect(splitKeystrokes(' 3')).toEqual([' ', '3']);
  });

  it('splits longer runs', () => {
    expect(splitKeystrokes(' 34')).toEqual([' ', '3', '4']);
  });

  it.each([
    ['arrow down', `${ESC}[B`],
    ['arrow up', `${ESC}[A`],
    ['bare escape', ESC]
  ])('keeps %s intact', (_name, sequence) => {
    // Escape sequences are multi-byte by nature; splitting them would turn one
    // arrow key into three meaningless characters.
    expect(splitKeystrokes(sequence)).toEqual([sequence]);
  });

  it('handles an empty chunk', () => {
    expect(splitKeystrokes('')).toEqual(['']);
  });
});

describe('isConfirm', () => {
  it.each(['\r', '\n'])('treats %j as confirm', stroke => {
    expect(isConfirm(stroke)).toBe(true);
  });

  it.each([' ', '3', 'q', ESC])('does not treat %j as confirm', stroke => {
    expect(isConfirm(stroke)).toBe(false);
  });
});
