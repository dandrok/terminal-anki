import { describe, expect, it } from 'vitest';
import {
  addDays,
  buildHeatmap,
  intensity,
  monthStrip,
  weekdayIndex,
  DEFAULT_DAILY_GOAL
} from '../../src/ui/charts/heatmap.js';
import { barText, stackedBar, SEGMENT_GLYPHS } from '../../src/ui/charts/stacked-bar.js';
import { sparkline, SPARK_GLYPHS } from '../../src/ui/charts/sparkline.js';
import { toDateKey } from '../../src/core/dates.js';

// A Saturday, so the current week is partial in every direction that matters.
const SATURDAY = new Date(2026, 7, 22, 12, 0);

describe('weekdayIndex', () => {
  it('puts Monday first and Sunday last', () => {
    expect(weekdayIndex(new Date(2026, 7, 17))).toBe(0); // Monday
    expect(weekdayIndex(new Date(2026, 7, 22))).toBe(5); // Saturday
    expect(weekdayIndex(new Date(2026, 7, 23))).toBe(6); // Sunday
  });
});

describe('addDays', () => {
  it('moves whole calendar days', () => {
    expect(toDateKey(addDays(new Date(2026, 7, 22), 1))).toBe('2026-08-23');
    expect(toDateKey(addDays(new Date(2026, 7, 1), -1))).toBe('2026-07-31');
  });

  it('crosses a year boundary', () => {
    expect(toDateKey(addDays(new Date(2026, 11, 31), 1))).toBe('2027-01-01');
  });

  it('keeps local midnight across a DST change', () => {
    // Adding 24h in milliseconds lands at 23:00 or 01:00 on a DST day, which
    // would put the cell in the wrong column.
    const before = new Date(2026, 2, 28);
    expect(toDateKey(addDays(before, 1))).toBe('2026-03-29');
    expect(addDays(before, 1).getHours()).toBe(0);
  });
});

describe('intensity', () => {
  it('is 0 only for a day with no reviews', () => {
    expect(intensity(0, 20)).toBe(0);
    expect(intensity(-1, 20)).toBe(0);
    expect(intensity(1, 20)).toBe(1);
  });

  it('steps up towards the goal and caps there', () => {
    expect(intensity(2, 20)).toBe(1);
    expect(intensity(6, 20)).toBe(2);
    expect(intensity(12, 20)).toBe(3);
    expect(intensity(20, 20)).toBe(4);
    expect(intensity(2000, 20)).toBe(4);
  });

  it('survives a zero goal instead of dividing by it', () => {
    expect(intensity(1, 0)).toBe(4);
    expect(Number.isFinite(intensity(1, 0))).toBe(true);
  });

  it('defaults to the standard daily goal', () => {
    expect(intensity(DEFAULT_DAILY_GOAL)).toBe(4);
  });
});

describe('buildHeatmap', () => {
  it('lays out seven rows of exactly `weeks` cells', () => {
    const grid = buildHeatmap(new Map(), { now: SATURDAY, weeks: 15 });
    expect(grid.rows).toHaveLength(7);
    for (const row of grid.rows) {
      expect(row).toHaveLength(15);
    }
  });

  it('ends on the Sunday closing the current week', () => {
    const grid = buildHeatmap(new Map(), { now: SATURDAY, weeks: 4 });
    // Last column, last row (Sunday).
    expect(grid.rows[6][3].date).toBe('2026-08-23');
    // First column, first row (Monday), three whole weeks earlier.
    expect(grid.rows[0][0].date).toBe('2026-07-27');
  });

  it('starts every column on a Monday', () => {
    const grid = buildHeatmap(new Map(), { now: SATURDAY, weeks: 6 });
    for (const cell of grid.rows[0]) {
      expect(weekdayIndex(new Date(`${cell.date}T00:00:00`))).toBe(0);
    }
  });

  it('marks days later this week as future and leaves them empty', () => {
    // Saturday: Sunday has not happened yet, and it must not count as a miss.
    const grid = buildHeatmap(new Map([['2026-08-23', 50]]), { now: SATURDAY, weeks: 2 });
    const sunday = grid.rows[6][1];
    expect(sunday.date).toBe('2026-08-23');
    expect(sunday.isFuture).toBe(true);
    expect(sunday.value).toBe(0);
    expect(grid.total).toBe(0);
  });

  it('places a value on its own local calendar day', () => {
    const grid = buildHeatmap(new Map([['2026-08-22', 7]]), { now: SATURDAY, weeks: 2 });
    const saturday = grid.rows[5][1];
    expect(saturday.date).toBe('2026-08-22');
    expect(saturday.value).toBe(7);
    expect(saturday.isFuture).toBe(false);
  });

  it('ignores values outside the window', () => {
    const grid = buildHeatmap(new Map([['2020-01-01', 999]]), { now: SATURDAY, weeks: 4 });
    expect(grid.total).toBe(0);
    expect(grid.activeDays).toBe(0);
  });

  it('summarises the window', () => {
    const grid = buildHeatmap(
      new Map([
        ['2026-08-20', 4],
        ['2026-08-21', 11],
        ['2026-08-22', 3]
      ]),
      { now: SATURDAY, weeks: 4 }
    );
    expect(grid.total).toBe(18);
    expect(grid.activeDays).toBe(3);
    expect(grid.best).toBe(11);
  });

  it('clamps a nonsense span to at least one week', () => {
    expect(buildHeatmap(new Map(), { now: SATURDAY, weeks: 0 }).weeks).toBe(1);
    expect(buildHeatmap(new Map(), { now: SATURDAY, weeks: -5 }).rows[0]).toHaveLength(1);
  });

  it('labels the column whose Monday opens a new month', () => {
    const grid = buildHeatmap(new Map(), { now: SATURDAY, weeks: 15 });
    const labels = grid.monthLabels.map(entry => entry.label);
    // 15 weeks back from Sunday 2026-08-23 starts on Monday 2026-05-18.
    expect(labels).toEqual(['May', 'Jun', 'Jul', 'Aug']);
    expect(grid.monthLabels[0].column).toBe(0);
    // Strictly increasing columns, one label per month.
    const columns = grid.monthLabels.map(entry => entry.column);
    expect([...columns].sort((a, b) => a - b)).toEqual(columns);
  });
});

describe('monthStrip', () => {
  it('puts each label over its own column when they all fit', () => {
    const grid = buildHeatmap(new Map(), { now: SATURDAY, weeks: 15 });
    const strip = monthStrip(grid);
    for (const { column, label } of grid.monthLabels) {
      expect(strip.slice(column * 2, column * 2 + label.length)).toBe(label);
    }
  });

  it('drops a label that would collide with the one before it', () => {
    // Two columns is four characters; a second three-letter month cannot start
    // at column 1 without overwriting the first, so it is skipped rather than
    // smeared into something that reads as a different month.
    const grid = buildHeatmap(new Map(), { now: SATURDAY, weeks: 8 });
    expect(grid.monthLabels.map(entry => entry.label)).toEqual(['Jun', 'Jul', 'Aug']);
    expect(monthStrip(grid).startsWith('Jun')).toBe(true);
    expect(monthStrip(grid)).not.toContain('Jul');
  });

  it('never runs wider than the grid it annotates', () => {
    const grid = buildHeatmap(new Map(), { now: SATURDAY, weeks: 15 });
    expect(monthStrip(grid).length).toBeLessThanOrEqual(grid.weeks * 2);
  });
});

describe('stackedBar', () => {
  it('is empty without data', () => {
    expect(stackedBar([], 40)).toEqual([]);
    expect(stackedBar([{ label: 'a', value: 0 }], 40)).toEqual([]);
    expect(stackedBar([{ label: 'a', value: 5 }], 0)).toEqual([]);
  });

  it('fills exactly the requested width', () => {
    // Three thirds of 40 is where naive rounding loses a column.
    const bar = stackedBar(
      [
        { label: 'a', value: 1 },
        { label: 'b', value: 1 },
        { label: 'c', value: 1 }
      ],
      40
    );
    expect(barText(bar)).toHaveLength(40);
  });

  it.each([1, 7, 13, 40, 79])('fills exactly %i columns for awkward ratios', width => {
    const bar = stackedBar(
      [
        { label: 'a', value: 17 },
        { label: 'b', value: 3 },
        { label: 'c', value: 1 },
        { label: 'd', value: 41 }
      ],
      width
    );
    expect(barText(bar)).toHaveLength(width);
  });

  it('gives every rendered segment at least one column', () => {
    const bar = stackedBar(
      [
        { label: 'big', value: 1000 },
        { label: 'tiny', value: 1 }
      ],
      20
    );
    expect(bar).toHaveLength(2);
    for (const segment of bar) {
      expect(segment.width).toBeGreaterThanOrEqual(1);
    }
  });

  it('keeps the largest segments when there are more than columns', () => {
    const bar = stackedBar(
      [
        { label: 'a', value: 1 },
        { label: 'b', value: 50 },
        { label: 'c', value: 40 }
      ],
      2
    );
    expect(bar.map(segment => segment.label)).toEqual(['b', 'c']);
    expect(barText(bar)).toHaveLength(2);
  });

  it('reports shares against the true total, not the rendered subset', () => {
    // Dropping a segment must not inflate the others' percentages.
    const bar = stackedBar(
      [
        { label: 'a', value: 50 },
        { label: 'b', value: 50 },
        { label: 'dropped', value: 100 }
      ],
      2
    );
    const shown = bar.map(segment => segment.share);
    expect(shown.reduce((sum, share) => sum + share, 0)).toBeLessThan(1);
  });

  it('preserves the caller ordering', () => {
    const bar = stackedBar(
      [
        { label: 'z', value: 1 },
        { label: 'a', value: 9 }
      ],
      10
    );
    expect(bar.map(segment => segment.label)).toEqual(['z', 'a']);
  });

  it('double-encodes segments with a glyph as well as a colour slot', () => {
    const bar = stackedBar(
      [
        { label: 'a', value: 1 },
        { label: 'b', value: 1 }
      ],
      10
    );
    expect(bar[0].glyph).toBe(SEGMENT_GLYPHS[0]);
    expect(bar[1].glyph).toBe(SEGMENT_GLYPHS[1]);
    expect(bar[0].glyph).not.toBe(bar[1].glyph);
  });

  it('trims the dominant segment when the one-column minimum overshoots', () => {
    // Four slivers each round down to zero, get lifted to one column, and
    // together push the bar past its width. The overflow comes off the widest
    // segment, not off the end of the bar.
    const bar = stackedBar(
      [
        { label: 'huge', value: 96 },
        { label: 'a', value: 1 },
        { label: 'b', value: 1 },
        { label: 'c', value: 1 },
        { label: 'd', value: 1 }
      ],
      5
    );
    expect(barText(bar)).toHaveLength(5);
    expect(bar.map(segment => segment.width)).toEqual([1, 1, 1, 1, 1]);
  });

  it('truncates a fractional width rather than rendering half a column', () => {
    expect(barText(stackedBar([{ label: 'a', value: 1 }], 10.9))).toHaveLength(10);
  });
});

describe('sparkline', () => {
  it('is empty for an empty series', () => {
    expect(sparkline([])).toBe('');
  });

  it('draws one glyph per value', () => {
    expect(sparkline([1, 2, 3])).toHaveLength(3);
  });

  it('draws a flat series flat', () => {
    expect(sparkline([5, 5, 5])).toBe(SPARK_GLYPHS[0].repeat(3));
  });

  it('spans the full ramp when scaled to the data', () => {
    const line = sparkline([0, 50, 100]);
    expect(line[0]).toBe(SPARK_GLYPHS[0]);
    expect(line[2]).toBe(SPARK_GLYPHS[SPARK_GLYPHS.length - 1]);
  });

  it('keeps a near-flat percentage run near-flat on a fixed scale', () => {
    // Auto-scaling would render 92-94% as a full-height staircase.
    const line = sparkline([92, 93, 94], { min: 0, max: 100 });
    expect(new Set(line).size).toBeLessThanOrEqual(2);
    expect(line).not.toContain(SPARK_GLYPHS[0]);
  });

  it('clamps values outside the fixed scale', () => {
    const line = sparkline([-20, 250], { min: 0, max: 100 });
    expect(line[0]).toBe(SPARK_GLYPHS[0]);
    expect(line[1]).toBe(SPARK_GLYPHS[SPARK_GLYPHS.length - 1]);
  });
});
