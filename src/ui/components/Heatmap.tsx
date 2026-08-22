import { Box, Text } from 'ink';
import {
  WEEKDAY_LABELS,
  monthStrip,
  type HeatmapGrid,
  type HeatmapCell
} from '../charts/heatmap.js';
import type { ThemePalette } from '../theme/palette.js';

/**
 * Shades for levels 0-4.
 *
 * The glyph ramp doubles the colour ramp so the grid still reads with colour
 * off, and level 0 is a middle dot rather than a space: an empty day should be
 * visibly empty, not a hole in the grid.
 */
const LEVEL_GLYPHS = ['·', '░', '▒', '▓', '█'] as const;

export interface HeatmapProps {
  grid: HeatmapGrid;
  theme: ThemePalette;
  /** Emphasise this date, if it is inside the window. */
  today?: string;
}

function cellColor(cell: HeatmapCell, theme: ThemePalette): string {
  return cell.level === 0 ? theme.muted : theme.heat[cell.level - 1];
}

/**
 * A GitHub-style contribution grid.
 *
 * Each cell is its glyph plus a literal trailing space *inside* the same
 * `<Text>`. Terminal cells are about twice as tall as they are wide, so one
 * character per day draws a grid squashed to half its proper width; two columns
 * per day gives it roughly square cells. Keeping the space inside the `<Text>`
 * rather than using a gap means Ink does not get a chance to collapse it.
 */
export function Heatmap({ grid, theme, today }: HeatmapProps) {
  const strip = monthStrip(grid);

  return (
    <Box flexDirection="column">
      <Box>
        <Box width={4} />
        <Text color={theme.muted}>{strip}</Text>
      </Box>

      {grid.rows.map((row, weekday) => (
        <Box key={WEEKDAY_LABELS[weekday]}>
          {/* Alternating labels: seven stacked three-letter words are noisier
              than the grid they are supposed to be annotating. */}
          <Box width={4}>
            <Text color={theme.muted}>{weekday % 2 === 0 ? WEEKDAY_LABELS[weekday] : ''}</Text>
          </Box>
          <Text>
            {row.map(cell =>
              cell.isFuture ? (
                <Text key={cell.date}>{'  '}</Text>
              ) : (
                <Text
                  key={cell.date}
                  color={cellColor(cell, theme)}
                  bold={cell.date === today}
                  dimColor={cell.level === 0}
                >
                  {`${LEVEL_GLYPHS[cell.level]} `}
                </Text>
              )
            )}
          </Text>
        </Box>
      ))}
    </Box>
  );
}

export interface HeatmapLegendProps {
  theme: ThemePalette;
  goal: number;
}

/** `less ▁▂▃▄ more`, using the same glyphs and colours as the grid itself. */
export function HeatmapLegend({ theme, goal }: HeatmapLegendProps) {
  return (
    <Box>
      <Text color={theme.muted}>less </Text>
      {LEVEL_GLYPHS.map((glyph, level) => (
        <Text
          key={glyph}
          color={level === 0 ? theme.muted : theme.heat[level - 1]}
          dimColor={level === 0}
        >
          {`${glyph} `}
        </Text>
      ))}
      <Text color={theme.muted}>{`more · full cell = ${goal} cards/day`}</Text>
    </Box>
  );
}
