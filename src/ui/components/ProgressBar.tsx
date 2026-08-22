import { Text } from 'ink';
import { useTheme } from '../hooks/useTheme.js';

export interface ProgressBarProps {
  current: number;
  total: number;
  width?: number;
  color?: string;
}

/** Filled/empty block bar. Pure presentation; the maths is clamped. */
export function ProgressBar({ current, total, width = 20, color }: ProgressBarProps) {
  const theme = useTheme();
  // String.repeat throws a RangeError on a negative or infinite count, and Ink
  // swallows render errors — so a bad width would silently blank the bar rather
  // than fail loudly. Callers pass literals today, but a width derived from the
  // terminal size goes negative the moment the window is narrow enough.
  const safeWidth = Math.max(0, Math.floor(Number.isFinite(width) ? width : 0));
  const safeTotal = Math.max(1, Number.isFinite(total) ? total : 1);
  const safeCurrent = Math.max(0, Number.isFinite(current) ? current : 0);
  const filled = Math.min(safeWidth, Math.floor((safeCurrent / safeTotal) * safeWidth));

  return (
    <Text color={color ?? theme.primary}>
      {'█'.repeat(filled)}
      {'░'.repeat(safeWidth - filled)}
    </Text>
  );
}
