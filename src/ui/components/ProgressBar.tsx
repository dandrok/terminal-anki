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
  const safeTotal = Math.max(1, Number.isFinite(total) ? total : 1);
  const safeCurrent = Math.max(0, Number.isFinite(current) ? current : 0);
  const filled = Math.min(width, Math.floor((safeCurrent / safeTotal) * width));

  return (
    <Text color={color ?? theme.primary}>
      {'█'.repeat(filled)}
      {'░'.repeat(Math.max(0, width - filled))}
    </Text>
  );
}
