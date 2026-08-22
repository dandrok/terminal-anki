import { Box, Text } from 'ink';
import type { ThemePalette } from '../theme/palette.js';

export interface HeaderBarProps {
  title: string;
  /** Right-aligned status, e.g. counts and streak. */
  status?: string;
  theme: ThemePalette;
  width: number;
}

export function HeaderBar({ title, status, theme, width }: HeaderBarProps) {
  return (
    <Box
      borderStyle="round"
      borderColor={theme.primary}
      paddingX={1}
      width={width}
      justifyContent="space-between"
    >
      <Text bold color={theme.primary}>
        {title}
      </Text>
      {status ? <Text color={theme.muted}>{status}</Text> : null}
    </Box>
  );
}
