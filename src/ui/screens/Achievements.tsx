import { Box, Text, useInput } from 'ink';
import { Layout } from '../components/Layout.js';
import { ProgressBar } from '../components/ProgressBar.js';
import { READONLY_CONTROLS } from '../controls.js';
import { useHelp } from '../hooks/useHelp.js';
import { useTheme } from '../hooks/useTheme.js';
import { useAppState } from '../hooks/useStore.js';
import { selectExtendedStats } from '../../state/selectors.js';
import type { AchievementCategory } from '../../types/index.js';

const CATEGORY_ORDER: { key: AchievementCategory; label: string }[] = [
  { key: 'cards', label: 'Cards' },
  { key: 'sessions', label: 'Sessions' },
  { key: 'streaks', label: 'Streaks' },
  { key: 'mastery', label: 'Mastery' }
];

export interface AchievementsProps {
  onBack: () => void;
}

export function Achievements({ onBack }: AchievementsProps) {
  const theme = useTheme();
  const { isHelpOpen, toggleHelp } = useHelp();
  const { achievements } = selectExtendedStats(useAppState());

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

  const unlocked = achievements.filter(achievement => achievement.unlockedAt).length;

  return (
    <Layout
      title="◑ Achievements"
      status={`${unlocked}/${achievements.length} unlocked`}
      controls={READONLY_CONTROLS}
      isHelpOpen={isHelpOpen}
    >
      <Box flexDirection="column">
        {CATEGORY_ORDER.map(category => {
          const inCategory = achievements.filter(a => a.category === category.key);
          if (inCategory.length === 0) {
            return null;
          }

          return (
            <Box key={category.key} flexDirection="column" marginBottom={1}>
              <Text bold color={theme.primary}>
                {category.label}
              </Text>
              {inCategory.map(achievement => {
                const { current, required, description } = achievement.progress;
                return (
                  <Box key={achievement.id} flexDirection="column">
                    <Box>
                      <Text color={achievement.unlockedAt ? theme.success : theme.muted}>
                        {achievement.unlockedAt ? '✓' : '·'} {achievement.icon} {achievement.name}
                      </Text>
                    </Box>
                    <Box paddingLeft={2}>
                      {achievement.unlockedAt ? (
                        <Text color={theme.muted}>
                          unlocked {achievement.unlockedAt.toLocaleDateString()}
                        </Text>
                      ) : (
                        <>
                          <ProgressBar current={current} total={required} width={16} />
                          <Text color={theme.muted}>
                            {' '}
                            {current}/{required} {description}
                          </Text>
                        </>
                      )}
                    </Box>
                  </Box>
                );
              })}
            </Box>
          );
        })}
      </Box>
    </Layout>
  );
}
