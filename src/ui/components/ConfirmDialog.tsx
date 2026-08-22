import { Box, Text } from 'ink';
import { useTheme } from '../hooks/useTheme.js';

export interface ConfirmDialogProps {
  question: string;
  detail?: string;
  confirmLabel?: string;
}

/**
 * A destructive-action prompt.
 *
 * Presentation only — the owning screen handles the keys, so the same y/n
 * convention applies wherever it is used.
 */
export function ConfirmDialog({ question, detail, confirmLabel = 'delete' }: ConfirmDialogProps) {
  const theme = useTheme();

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={theme.error}
      paddingX={2}
      paddingY={1}
    >
      <Text bold color={theme.error}>
        {question}
      </Text>
      {detail ? <Text color={theme.muted}>{detail}</Text> : null}
      <Box marginTop={1}>
        <Text color={theme.muted}>
          <Text color={theme.error}>[y]</Text> {confirmLabel}
          {'   '}
          <Text color={theme.primary}>[n]</Text> cancel
        </Text>
      </Box>
    </Box>
  );
}
