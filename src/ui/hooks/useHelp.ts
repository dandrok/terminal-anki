import { useCallback, useState } from 'react';
import { useInput } from 'ink';

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
      if (input === '?' || input === 'h' || key.escape) {
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
