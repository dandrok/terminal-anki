import { useState, type ReactNode } from 'react';
import { Box, Text } from 'ink';
import { Layout } from '../components/Layout.js';
import { Heatmap, HeatmapLegend } from '../components/Heatmap.js';
import { StackedBar } from '../components/StackedBar.js';
import { screenControls, type Control } from '../controls.js';
import { useScreenInput } from '../hooks/useScreenInput.js';
import { useHelp } from '../hooks/useHelp.js';
import { useTheme } from '../hooks/useTheme.js';
import { useAppState } from '../hooks/useStore.js';
import { useTerminalSize } from '../hooks/useTerminalSize.js';
import {
  selectAccuracyTrend,
  selectDailyCardCounts,
  selectExtendedStats
} from '../../state/selectors.js';
import { buildHeatmap, DEFAULT_DAILY_GOAL, HEATMAP_WEEKS } from '../charts/heatmap.js';
import { sparkline } from '../charts/sparkline.js';
import { toDateKey } from '../../core/dates.js';
import { sessionAccuracy } from '../../core/stats.js';
import { plural } from '../format.js';

const VIEWS = ['activity', 'sessions', 'tags'] as const;
type View = (typeof VIEWS)[number];

const VIEW_LABELS: Record<View, string> = {
  activity: 'Activity',
  sessions: 'Sessions',
  tags: 'Tags'
};

const ANALYTICS_CONTROLS: Control[] = screenControls([
  { key: '←→/hl', label: 'view', description: 'Switch between activity, sessions and tags' }
]);

export interface AnalyticsProps {
  onBack: () => void;
  onQuit: () => void;
}

/**
 * Study history, in three panes.
 *
 * Panes rather than one long page because a terminal does not scroll usefully
 * under a fixed frame: everything below the fold is simply lost. Each pane is
 * sized to fit above the footer at 24 rows.
 */
export function Analytics({ onBack, onQuit }: AnalyticsProps) {
  const theme = useTheme();
  const { isHelpOpen, toggleHelp } = useHelp();
  const { columns, isNarrow } = useTerminalSize();
  const state = useAppState();
  const stats = selectExtendedStats(state);

  const [viewIndex, setViewIndex] = useState(0);
  const view: View = VIEWS[viewIndex];

  useScreenInput({
    isHelpOpen,
    toggleHelp,
    onBack,
    onQuit,
    onKey: (stroke, key) => {
      // Functional updates, because Ink delivers everything that arrived in
      // one read as a single chunk: pressing l twice quickly gives "ll", and
      // reading viewIndex from the render closure would move only one pane.
      if (key.leftArrow || stroke === 'h') {
        setViewIndex(current => (current - 1 + VIEWS.length) % VIEWS.length);
      } else if (key.rightArrow || stroke === 'l' || key.tab) {
        setViewIndex(current => (current + 1) % VIEWS.length);
      }
      return false;
    }
  });

  const now = new Date();
  // A 15-week grid is 30 columns of cells plus the weekday gutter; halve the
  // span rather than let it wrap into an unreadable second block.
  const weeks = isNarrow ? Math.floor(HEATMAP_WEEKS / 2) : HEATMAP_WEEKS;
  const grid = buildHeatmap(selectDailyCardCounts(state), { now, weeks });
  const trend = selectAccuracyTrend(state);
  const barWidth = Math.max(20, Math.min(columns - 12, 44));

  const tabs = (
    <Box marginBottom={1}>
      {VIEWS.map(name => (
        <Text
          key={name}
          color={name === view ? theme.primary : theme.muted}
          bold={name === view}
          underline={name === view}
        >
          {` ${VIEW_LABELS[name]} `}
        </Text>
      ))}
    </Box>
  );

  const panes: Record<View, () => ReactNode> = {
    activity: () => (
      <Box flexDirection="column">
        <Heatmap grid={grid} theme={theme} today={toDateKey(now)} />
        <Box marginTop={1}>
          <HeatmapLegend theme={theme} goal={DEFAULT_DAILY_GOAL} />
        </Box>
        <Box marginTop={1} flexDirection="column">
          <Text color={theme.muted}>
            {`${plural(grid.total, 'card')} over ${plural(grid.activeDays, 'day')} in ${weeks} weeks · best day ${grid.best}`}
          </Text>
          <Text color={theme.muted}>
            {`streak ${stats.learningStreak.currentStreak}d · longest ${stats.learningStreak.longestStreak}d`}
          </Text>
        </Box>
      </Box>
    ),

    sessions: () => {
      const recent = [...stats.recentSessions].slice(-8).reverse();
      if (recent.length === 0) {
        return (
          <Text italic color={theme.muted}>
            No sessions recorded yet. Study some cards and this fills in.
          </Text>
        );
      }
      return (
        <Box flexDirection="column">
          <Text color={theme.muted}>
            {/* Not "X min over N sessions": the minutes count every session,
                the average only the completed ones. */}
            {`${stats.totalStudyTime.toFixed(1)} min studied · ${plural(stats.sessionsCompleted, 'completed session')} · avg ${stats.averageSessionLength.toFixed(1)} min`}
          </Text>
          {trend.length > 0 ? (
            <Box marginTop={1}>
              <Text color={theme.muted}>accuracy </Text>
              {/* Fixed 0-100 scale: auto-scaling a flat 92-94% run would draw
                  it as a cliff. */}
              <Text color={theme.success}>
                {sparkline(
                  trend.map(day => day.accuracy),
                  { min: 0, max: 100 }
                )}
              </Text>
              <Text color={theme.muted}>{` last ${plural(trend.length, 'study day')}`}</Text>
            </Box>
          ) : null}

          <Box flexDirection="column" marginTop={1}>
            {recent.map(session => {
              const accuracy = sessionAccuracy(session);
              return (
                <Box key={session.id}>
                  <Text color={theme.muted}>{`${toDateKey(session.startTime)}  `}</Text>
                  <Text color={theme.text}>{String(session.cardsStudied).padStart(3)} cards </Text>
                  <Text color={accuracy >= 80 ? theme.success : theme.warning}>
                    {`${accuracy.toFixed(0)}%`.padStart(5)}
                  </Text>
                  <Text color={theme.muted}>
                    {`  ${session.sessionType}${session.quitEarly ? ' · quit early' : ''}`}
                  </Text>
                </Box>
              );
            })}
          </Box>
        </Box>
      );
    },

    tags: () => {
      const segments = Object.entries(stats.tagDistribution)
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value);

      if (segments.length === 0) {
        return (
          <Text italic color={theme.muted}>
            No tags yet. Add tags to your cards to see how your deck splits up.
          </Text>
        );
      }
      return (
        <Box flexDirection="column">
          <Text color={theme.muted}>How the deck splits across tags</Text>
          <Box marginTop={1}>
            <StackedBar segments={segments} theme={theme} width={barWidth} />
          </Box>
        </Box>
      );
    }
  };

  return (
    <Layout
      title="◰ Analytics & history"
      status={VIEW_LABELS[view]}
      controls={ANALYTICS_CONTROLS}
      isHelpOpen={isHelpOpen}
    >
      <Box flexDirection="column">
        {tabs}
        {panes[view]()}
      </Box>
    </Layout>
  );
}
