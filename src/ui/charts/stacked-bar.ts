/**
 * Shading glyphs, cycled across segments.
 *
 * Colour alone is not enough: in a monochrome terminal, or for a red-green
 * colour-blind reader, adjacent segments of a stacked bar become one
 * indistinguishable block. The glyph carries the same boundary information as
 * the colour, so the bar survives losing either.
 */
export const SEGMENT_GLYPHS = ['█', '▓', '▒', '░'] as const;

export interface BarSegment {
  label: string;
  value: number;
}

export interface RenderedSegment extends BarSegment {
  /** Columns this segment occupies. */
  width: number;
  glyph: string;
  /** Fraction of the total, 0-1. */
  share: number;
  /** Index into the caller's colour ramp. */
  slot: number;
}

/**
 * Apportion `width` columns across segments.
 *
 * Every visible segment is guaranteed at least one column, and the widest
 * segment absorbs the rounding remainder, so the rendered widths always sum to
 * exactly `width`. Rounding each share independently leaves the bar a column
 * short or long depending on the data, which shows up as a ragged right edge
 * that moves as you study.
 */
export function stackedBar(segments: readonly BarSegment[], width: number): RenderedSegment[] {
  const columns = Math.max(0, Math.trunc(width));
  const positive = segments.filter(segment => segment.value > 0);
  const total = positive.reduce((sum, segment) => sum + segment.value, 0);

  if (columns === 0 || total === 0 || positive.length === 0) {
    return [];
  }

  // More segments than columns: keep the largest that fit rather than emitting
  // zero-width entries the renderer would have to filter out again.
  const ranked = new Set([...positive].sort((a, b) => b.value - a.value).slice(0, columns));
  const shown = positive.filter(segment => ranked.has(segment));
  const shownTotal = shown.reduce((sum, segment) => sum + segment.value, 0);

  const rendered = shown.map((segment, index) => ({
    ...segment,
    share: segment.value / total,
    glyph: SEGMENT_GLYPHS[index % SEGMENT_GLYPHS.length],
    slot: index,
    width: Math.max(1, Math.floor((segment.value / shownTotal) * columns))
  }));

  // Guaranteeing a minimum of one column can overshoot; trim from the widest
  // until it fits, then hand any shortfall back to the widest.
  let used = rendered.reduce((sum, segment) => sum + segment.width, 0);
  while (used > columns) {
    const widest = largestIndex(rendered);
    if (rendered[widest].width <= 1) {
      break;
    }
    rendered[widest].width -= 1;
    used -= 1;
  }
  if (used < columns) {
    rendered[largestIndex(rendered)].width += columns - used;
  }

  return rendered;
}

function largestIndex(segments: readonly RenderedSegment[]): number {
  let best = 0;
  for (let index = 1; index < segments.length; index++) {
    if (segments[index].width > segments[best].width) {
      best = index;
    }
  }
  return best;
}

/** The bar as plain text, for tests and for non-Ink callers. */
export function barText(segments: readonly RenderedSegment[]): string {
  return segments.map(segment => segment.glyph.repeat(segment.width)).join('');
}
