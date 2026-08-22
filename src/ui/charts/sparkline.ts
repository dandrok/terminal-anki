/** Eighths, low to high. */
export const SPARK_GLYPHS = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'] as const;

export interface SparklineOptions {
  /** Fix the scale, e.g. 0-100 for a percentage, instead of scaling to the data. */
  min?: number;
  max?: number;
}

/**
 * A one-line chart of a series.
 *
 * Defaults to scaling to the data's own range, but percentages should pass an
 * explicit `0`-`100`: auto-scaling turns a flat run of 92-94% into a dramatic
 * staircase, which reads as a collapse that never happened.
 */
export function sparkline(values: readonly number[], options: SparklineOptions = {}): string {
  if (values.length === 0) {
    return '';
  }

  const min = options.min ?? Math.min(...values);
  const max = options.max ?? Math.max(...values);
  const span = max - min;

  return values
    .map(value => {
      if (span <= 0) {
        // A flat series has no shape; draw it flat rather than at full height.
        return SPARK_GLYPHS[0];
      }
      const clamped = Math.min(max, Math.max(min, value));
      const index = Math.round(((clamped - min) / span) * (SPARK_GLYPHS.length - 1));
      return SPARK_GLYPHS[index];
    })
    .join('');
}
