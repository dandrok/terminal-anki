import { Box, Text } from 'ink';
import type { Control } from '../controls.js';
import type { ThemePalette } from '../theme/palette.js';

export interface HelpOverlayProps {
  controls: readonly Control[];
  theme: ThemePalette;
  isNarrow: boolean;
}

export function HelpOverlay({ controls, theme, isNarrow }: HelpOverlayProps) {
  // Manual padEnd rather than a Box width: these are sibling <Text> nodes in
  // one row, so flex widths would not align them.
  const keyWidth = Math.max(...controls.map(control => `[${control.key}] ${control.label}`.length));

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={theme.primary}
      paddingX={2}
      paddingY={1}
      gap={isNarrow ? 1 : 0}
    >
      <Box marginBottom={1}>
        <Text bold color={theme.primary}>
          Keys on this screen
        </Text>
      </Box>

      {controls.map(control => {
        const shortcut = `[${control.key}] ${control.label}`;
        return (
          <Box key={control.key} flexDirection={isNarrow ? 'column' : 'row'}>
            <Text color={theme.secondary}>{isNarrow ? shortcut : shortcut.padEnd(keyWidth)}</Text>
            <Text color={theme.muted}>
              <Text color={theme.primary}>{isNarrow ? '  └─▶ ' : '  ──▶ '}</Text>
              {control.description}
            </Text>
          </Box>
        );
      })}

      <Box marginTop={1}>
        <Text italic color={theme.muted}>
          press [?] or [esc] to close
        </Text>
      </Box>
    </Box>
  );
}
