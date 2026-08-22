import { Box, Text, useInput } from 'ink';
import { Layout } from '../components/Layout.js';
import { READONLY_CONTROLS } from '../controls.js';
import { useHelp } from '../hooks/useHelp.js';
import { useTheme } from '../hooks/useTheme.js';
import { useAppState } from '../hooks/useStore.js';
import { selectExtendedStats } from '../../state/selectors.js';
import type { DifficultyLevel } from '../../types/index.js';

const BUCKETS: { key: DifficultyLevel; label: string }[] = [
  { key: 'new', label: 'New (≤1 day)' },
  { key: 'learning', label: 'Learning (2-7 days)' },
  { key: 'young', label: 'Young (1-4 weeks)' },
  { key: 'mature', label: 'Mature (1+ month)' }
];

export interface QuickStatsProps {
  onBack: () => void;
}

export function QuickStats({ onBack }: QuickStatsProps) {
  const theme = useTheme();
  const { isHelpOpen, toggleHelp } = useHelp();
  const stats = selectExtendedStats(useAppState());

  useInput((input, key) => {
    if (isHelpOpen) {
      return;
    }
    if (input === '?') {
      toggleHelp();
    } else if (key.escape || input === 'q') {
      onBack();
    }
  });

  const unlocked = stats.achievements.filter(achievement => achievement.unlockedAt).length;
  const row = (label: string, value: string) => (
    <Box key={label}>
      <Text color={theme.muted}>{label.padEnd(20)}</Text>
      <Text color={theme.text}>{value}</Text>
    </Box>
  );

  return (
    <Layout title="◈ Quick stats" controls={READONLY_CONTROLS} isHelpOpen={isHelpOpen}>
      <Box flexDirection="column">
        {row('Total cards', String(stats.totalCards))}
        {row('Due today', String(stats.dueCards))}
        {row('Total reviews', String(stats.totalReviews))}
        {row('Average easiness', stats.averageEasiness.toFixed(2))}
        {row('Current streak', `${stats.learningStreak.currentStreak} days`)}
        {row('Achievements', `${unlocked}/${stats.achievements.length}`)}

        <Box marginTop={1}>
          <Text bold color={theme.primary}>
            Card distribution
          </Text>
        </Box>
        {BUCKETS.map(bucket => (
          <Box key={bucket.key}>
            <Text color={theme[bucket.key]}>{bucket.label.padEnd(20)}</Text>
            <Text color={theme.text}>{stats.distribution[bucket.key]} cards</Text>
          </Box>
        ))}
      </Box>
    </Layout>
  );
}
