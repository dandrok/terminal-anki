import { useEffect, useState } from 'react';
import { useStdout } from 'ink';

/** Below this width, the footer drops its labels and columns stack. */
export const NARROW_COLUMNS = 72;

export interface TerminalSize {
  columns: number;
  rows: number;
  isNarrow: boolean;
}

/**
 * Live terminal dimensions.
 *
 * One hook, deliberately: the underlying `stdout.on('resize')` subscription is
 * easy to duplicate per component and then drift.
 */
export function useTerminalSize(): TerminalSize {
  const { stdout } = useStdout();
  const [size, setSize] = useState(() => ({
    columns: stdout?.columns ?? 80,
    rows: stdout?.rows ?? 24
  }));

  useEffect(() => {
    if (!stdout) {
      return;
    }

    const onResize = (): void => {
      setSize({ columns: stdout.columns ?? 80, rows: stdout.rows ?? 24 });
    };

    stdout.on('resize', onResize);
    return () => {
      stdout.off('resize', onResize);
    };
  }, [stdout]);

  return { ...size, isNarrow: size.columns < NARROW_COLUMNS };
}
