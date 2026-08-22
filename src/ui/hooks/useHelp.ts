import { useCallback, useState } from 'react';
import { useInput } from 'ink';
import { splitKeystrokes } from '../keystrokes.js';

export interface Help {
  isHelpOpen: boolean;
  toggleHelp: () => void;
  closeHelp: () => void;
}

/**
 * Help overlay state.
 *
 * The hook owns *closing* only, and its `useInput` is registered with
 * `isActive: isHelpOpen` so it does not exist while the overlay is shut and
 * therefore cannot steal keys from the screen underneath. Screens own opening,
 * and each screen's own handler must start with `if (isHelpOpen) return;`.
 */
export function useHelp(): Help {
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  useInput(
    (input, key) => {
      const strokes = splitKeystrokes(input);
      // `q` closes it too. Everywhere else in the application q and esc mean
      // "leave what you are in", and while the overlay is up, what you are in
      // is the overlay — pressing q and having nothing happen was the only
      // place that rule did not hold. Not `h`: that is the stepper's -1 key.
      if (strokes.includes('?') || strokes.includes('q') || (strokes.length === 1 && key.escape)) {
        setIsHelpOpen(false);
      }
    },
    { isActive: isHelpOpen }
  );

  return {
    isHelpOpen,
    toggleHelp: useCallback(() => setIsHelpOpen(open => !open), []),
    closeHelp: useCallback(() => setIsHelpOpen(false), [])
  };
}
