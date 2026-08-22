import { useInput, type Key } from 'ink';
import { splitKeystrokes } from '../keystrokes.js';

export interface ScreenInputOptions {
  isHelpOpen: boolean;
  toggleHelp: () => void;
  /** Leave this screen. Omitted on the root screen, where leaving means quitting. */
  onBack?: () => void;
  /** Quit the application. Only the root screen supplies this. */
  onQuit?: () => void;
  /**
   * Screen-specific keys, tried only after the standard ones. Return `true` to
   * stop processing the rest of a chunk — needed when the handler moved to
   * another card or screen, because React state has not committed yet.
   */
  onKey?: (stroke: string, key: Key) => boolean | void;
  isActive?: boolean;
}

/**
 * The standard key handling every screen shares.
 *
 * Centralised so `q`, `esc` and `?` cannot come to mean different things on
 * different screens — which is exactly what happened when each screen wrote its
 * own `useInput`: `q` variously quit the app, went back, and ended a session.
 *
 * The `isHelpOpen` early return is load-bearing. `useHelp` owns *closing* via a
 * handler registered with `{ isActive: isHelpOpen }`; without this guard both
 * would fire on `?` and the overlay would reopen immediately.
 */
export function useScreenInput({
  isHelpOpen,
  toggleHelp,
  onBack,
  onQuit,
  onKey,
  isActive = true
}: ScreenInputOptions): void {
  useInput(
    (input, key) => {
      if (isHelpOpen) {
        return;
      }

      const strokes = splitKeystrokes(input);
      for (const stroke of strokes) {
        const single = strokes.length === 1;
        const escape = single ? key.escape : false;

        if (stroke === '?') {
          toggleHelp();
          return;
        }
        // One rule: q and esc leave the current screen. The root screen has
        // nothing to go back to, so leaving it quits.
        if (stroke === 'q' || escape) {
          (onBack ?? onQuit)?.();
          return;
        }

        if (onKey?.(stroke, key) === true) {
          return;
        }
      }
    },
    { isActive }
  );
}
