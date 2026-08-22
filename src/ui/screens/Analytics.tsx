import { Box, Text } from 'ink';
import { Layout } from '../components/Layout.js';
import { READONLY_CONTROLS } from '../controls.js';
import { useScreenInput } from '../hooks/useScreenInput.js';
import { useHelp } from '../hooks/useHelp.js';
import { useTheme } from '../hooks/useTheme.js';
import { useAppState } from '../hooks/useStore.js';
import { selectExtendedStats } from '../../state/selectors.js';
import { sessionAccuracy } from '../../core/stats.js';

export interface AnalyticsProps {
  onBack: () => void;
  onQuit: () => void;
}

export function Analytics({ onBack, onQuit }: AnalyticsProps) {
  const theme = useTheme();
  const { isHelpOpen, toggleHelp } = useHelp();
  const stats = selectExtendedStats(useAppState());

  useScreenInput({ isHelpOpen, toggleHelp, onBack, onQuit });

  const tags = Object.entries(stats.tagDistribution).sort(([, a], [, b]) => b - a);
  const recent = [...stats.recentSessions].slice(-5).reverse();

  return (
    <Layout title="◰ Analytics & history" controls={READONLY_CONTROLS} isHelpOpen={isHelpOpen}>
      <Box flexDirection="column" gap={1}>
        <Box flexDirection="column">
          <Text bold color={theme.primary}>
            Study
          </Text>
          <Text color={theme.muted}>
            {stats.totalStudyTime.toFixed(1)} minutes over {stats.sessionsCompleted} completed
            sessions (avg {stats.averageSessionLength.toFixed(1)} min)
          </Text>
          <Text color={theme.muted}>
            streak {stats.learningStreak.currentStreak}d · longest{' '}
            {stats.learningStreak.longestStreak}d
          </Text>
        </Box>

        {tags.length > 0 ? (
          <Box flexDirection="column">
            <Text bold color={theme.primary}>
              Tags
            </Text>
            {tags.slice(0, 8).map(([tag, count]) => (
              <Text key={tag} color={theme.muted}>
                {tag.padEnd(18)} {count}
              </Text>
            ))}
          </Box>
        ) : null}

        {recent.length > 0 ? (
          <Box flexDirection="column">
            <Text bold color={theme.primary}>
              Recent sessions
            </Text>
            {recent.map(session => (
              <Text key={session.id} color={theme.muted}>
                {session.startTime.toLocaleDateString()} · {session.cardsStudied} cards ·{' '}
                {sessionAccuracy(session).toFixed(0)}%{session.quitEarly ? ' (quit early)' : ''}
              </Text>
            ))}
          </Box>
        ) : (
          <Text italic color={theme.muted}>
            No sessions recorded yet. A richer history lands in the next phase.
          </Text>
        )}
      </Box>
    </Layout>
  );
}
