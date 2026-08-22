const ESC = String.fromCharCode(27);

/**
 * Split one Ink input chunk into individual keystrokes.
 *
 * Ink hands over whatever arrived in a single read, so typing quickly — which
 * the study loop actively encourages, two keys per card — delivers `" 3"`
 * rather than `" "` then `"3"`. A handler comparing the whole string against
 * single characters silently drops both.
 *
 * Escape sequences (arrow keys and friends) are multi-byte by nature and must
 * stay intact, so anything starting with ESC is passed through whole.
 */
export function splitKeystrokes(input: string): string[] {
  if (input.length <= 1 || input.startsWith(ESC)) {
    return [input];
  }
  return [...input];
}

/** True when a keystroke means "confirm". */
export function isConfirm(stroke: string): boolean {
  return stroke === '\r' || stroke === '\n';
}
