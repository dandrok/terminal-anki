import { Box, Text, useInput } from 'ink';
import { Layout } from '../components/Layout.js';
import { HELP_CONTROL, type Control } from '../controls.js';
import { useHelp } from '../hooks/useHelp.js';
import { useTheme } from '../hooks/useTheme.js';

const SUMMARY_CONTROLS: Control[] = [
  { key: '⏎/esc', label: 'menu', description: 'Return to the main menu' },
  HELP_CONTROL
];

export interface SessionSummaryProps {
  studied: number;
  correctAnswers: number;
  skipped: number;
  remainingDue: number;
  quitEarly: boolean;
  onDone: () => void;
}

/**
 * The result of a session, as a screen.
 *
 * v1 printed this with console.log, so it scrolled away the moment the menu
 * redrew. Here it stays put until dismissed.
 */
export function SessionSummary({
  studied,
  correctAnswers,
  skipped,
  remainingDue,
  quitEarly,
  onDone
}: SessionSummaryProps) {
  const theme = useTheme();
  const { isHelpOpen, toggleHelp } = useHelp();

  useInput((input, key) => {
    if (isHelpOpen) {
      return;
    }
    if (input === '?') {
      toggleHelp();
    } else if (key.return || key.escape || input === 'q' || input === ' ') {
      onDone();
    }
  });

  const accuracy = studied > 0 ? Math.round((correctAnswers / studied) * 100) : 0;

  const row = (label: string, value: string, color?: string) => (
    <Box key={label}>
      <Text color={theme.muted}>{label.padEnd(20)}</Text>
      <Text color={color ?? theme.text}>{value}</Text>
    </Box>
  );

  return (
    <Layout title="◎ Session complete" controls={SUMMARY_CONTROLS} isHelpOpen={isHelpOpen}>
      <Box flexDirection="column">
        {row('Studied', `${studied} cards`, theme.success)}
        {studied > 0 ? row('Accuracy', `${accuracy}%`) : null}
        {skipped > 0 ? row('Skipped', `${skipped} cards`) : null}
        {row('Remaining due', `${remainingDue} cards`)}

        <Box marginTop={1}>
          <Text color={theme.muted}>
            {quitEarly ? 'Ended early — see you next time.' : 'Nice work. Keep it up.'}
          </Text>
        </Box>
      </Box>
    </Layout>
  );
}
