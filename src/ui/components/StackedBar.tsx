import { Box, Text } from 'ink';
import { stackedBar, type BarSegment } from '../charts/stacked-bar.js';
import type { ThemePalette } from '../theme/palette.js';

/** Cycled per segment, so neighbouring segments never share a colour. */
function rampOf(theme: ThemePalette): string[] {
  return [theme.primary, theme.success, theme.warning, theme.secondary, theme.learning];
}

export interface StackedBarProps {
  segments: readonly BarSegment[];
  theme: ThemePalette;
  width?: number;
  /** Show the label/percentage list under the bar. */
  showLegend?: boolean;
}

/**
 * A single-line stacked bar with a legend.
 *
 * Widths come from the pure `stackedBar`, which guarantees they sum to exactly
 * `width` — so the bar's right edge stays put no matter how the data shifts.
 */
export function StackedBar({ segments, theme, width = 44, showLegend = true }: StackedBarProps) {
  const rendered = stackedBar(segments, width);
  const ramp = rampOf(theme);

  if (rendered.length === 0) {
    return (
      <Text italic color={theme.muted}>
        Nothing to chart yet.
      </Text>
    );
  }

  return (
    <Box flexDirection="column">
      <Text>
        {rendered.map(segment => (
          <Text key={segment.label} color={ramp[segment.slot % ramp.length]}>
            {segment.glyph.repeat(segment.width)}
          </Text>
        ))}
      </Text>

      {showLegend ? (
        <Box flexDirection="column">
          {rendered.map(segment => (
            <Box key={segment.label}>
              <Text color={ramp[segment.slot % ramp.length]}>{`${segment.glyph} `}</Text>
              <Text color={theme.text}>{segment.label.padEnd(18)}</Text>
              <Text color={theme.muted}>
                {`${segment.value}  ${(segment.share * 100).toFixed(0)}%`}
              </Text>
            </Box>
          ))}
        </Box>
      ) : null}
    </Box>
  );
}
