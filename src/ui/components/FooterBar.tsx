import { Box, Text } from 'ink';
import type { Control } from '../controls.js';
import type { ThemePalette } from '../theme/palette.js';

export interface FooterBarProps {
  controls: readonly Control[];
  theme: ThemePalette;
  /** Drop the labels and show bare keys when the terminal is narrow. */
  isNarrow: boolean;
}

export function FooterBar({ controls, theme, isNarrow }: FooterBarProps) {
  return (
    <Box marginTop={1} gap={1} flexWrap="wrap">
      {controls.map(control => (
        <Text key={control.key} color={theme.muted}>
          <Text color={theme.secondary}>[{control.key}]</Text>
          {isNarrow ? '' : ` ${control.label}`}
        </Text>
      ))}
    </Box>
  );
}
