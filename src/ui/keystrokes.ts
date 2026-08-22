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
 * stay intact — including when they follow ordinary characters in the same
 * read, as in "a" then a down-arrow. Splitting one of those would turn a single
 * arrow key into three meaningless characters.
 */
export function splitKeystrokes(input: string): string[] {
  if (input.length <= 1) {
    return [input];
  }

  const strokes: string[] = [];
  let index = 0;

  while (index < input.length) {
    if (input[index] !== ESC) {
      strokes.push(input[index]);
      index++;
      continue;
    }

    // CSI (ESC [ … final) and SS3 (ESC O final) both end at the first byte in
    // the final range; a bare ESC with nothing after it stands alone.
    const introducer = input[index + 1];
    if (introducer !== '[' && introducer !== 'O') {
      strokes.push(ESC);
      index++;
      continue;
    }

    let end = index + 2;
    while (end < input.length && !/[A-Za-z~]/.test(input[end])) {
      end++;
    }
    strokes.push(input.slice(index, Math.min(end + 1, input.length)));
    index = end + 1;
  }

  return strokes;
}

/** True when a keystroke is the up-arrow escape sequence. */
export function isArrowUp(stroke: string): boolean {
  return stroke === `${ESC}[A` || stroke === `${ESC}OA`;
}

/** True when a keystroke is the down-arrow escape sequence. */
export function isArrowDown(stroke: string): boolean {
  return stroke === `${ESC}[B` || stroke === `${ESC}OB`;
}

/** True when a keystroke means "confirm". */
export function isConfirm(stroke: string): boolean {
  return stroke === '\r' || stroke === '\n';
}
