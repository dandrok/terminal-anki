import { startOfDay, toDateKey } from '../../core/dates.js';

/** How many weeks the grid spans, including the current, partial one. */
export const HEATMAP_WEEKS = 15;

/**
 * Cards per day that counts as a full cell.
 *
 * Intensity is a ratio to this rather than to the busiest day in the window:
 * scaling to the maximum makes the whole grid darken the moment you have one
 * unusually heavy day, so a steady habit looks like it fell apart. A fixed goal
 * keeps yesterday's cell the same colour tomorrow.
 */
export const DEFAULT_DAILY_GOAL = 20;

/** Monday first, matching the row order of the grid. */
export const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec'
] as const;

export interface HeatmapCell {
  /** Local-calendar YYYY-MM-DD. */
  date: string;
  value: number;
  /** 0-4. */
  level: number;
  /** Days later this week, which have not happened yet. */
  isFuture: boolean;
}

export interface MonthLabel {
  /** Index into the week columns. */
  column: number;
  label: string;
}

export interface HeatmapGrid {
  weeks: number;
  /** `rows[weekday][week]`, Monday first — the shape the renderer draws. */
  rows: HeatmapCell[][];
  monthLabels: MonthLabel[];
  /** Totals across the window, so callers need not walk the grid again. */
  total: number;
  activeDays: number;
  best: number;
  goal: number;
}

export interface HeatmapOptions {
  now?: Date;
  weeks?: number;
  goal?: number;
}

/** Monday-first weekday index: Mon 0 … Sun 6. */
export function weekdayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

/**
 * Shift by whole calendar days.
 *
 * Constructed from the local Y/M/D fields rather than by adding 24h in
 * milliseconds, which lands on the wrong day across a DST boundary and would
 * shear one column of the grid.
 */
export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/**
 * Which of the five shades a day earns.
 *
 * Any study at all is at least level 1: the difference between "nothing" and
 * "something" is the one the grid most needs to show.
 */
export function intensity(value: number, goal: number = DEFAULT_DAILY_GOAL): number {
  if (value <= 0) {
    return 0;
  }
  const ratio = value / Math.max(1, goal);
  if (ratio >= 1) {
    return 4;
  }
  if (ratio >= 0.6) {
    return 3;
  }
  if (ratio >= 0.3) {
    return 2;
  }
  return 1;
}

/**
 * Lay out a GitHub-style contribution grid ending with the current week.
 *
 * The window is anchored to the *end* of this week rather than to today, so the
 * final column is a whole week and today keeps its weekday row as the days pass
 * instead of sliding along it.
 */
export function buildHeatmap(
  values: ReadonlyMap<string, number>,
  options: HeatmapOptions = {}
): HeatmapGrid {
  const { now = new Date(), weeks = HEATMAP_WEEKS, goal = DEFAULT_DAILY_GOAL } = options;
  const span = Math.max(1, Math.trunc(weeks));

  const today = startOfDay(now);
  // Sunday closes a Monday-first week.
  const end = addDays(today, 6 - weekdayIndex(today));
  const start = addDays(end, -(span * 7 - 1));

  const rows: HeatmapCell[][] = Array.from({ length: 7 }, () => []);
  const monthLabels: MonthLabel[] = [];
  let previousMonth = -1;
  let total = 0;
  let activeDays = 0;
  let best = 0;

  for (let week = 0; week < span; week++) {
    for (let weekday = 0; weekday < 7; weekday++) {
      const date = addDays(start, week * 7 + weekday);
      const key = toDateKey(date);
      const isFuture = date.getTime() > today.getTime();
      const value = isFuture ? 0 : (values.get(key) ?? 0);

      rows[weekday].push({
        date: key,
        value,
        level: intensity(value, goal),
        isFuture
      });

      total += value;
      if (value > 0) {
        activeDays += 1;
      }
      best = Math.max(best, value);
    }

    // Label a column when its Monday opens a new month.
    const monday = addDays(start, week * 7);
    if (monday.getMonth() !== previousMonth) {
      previousMonth = monday.getMonth();
      monthLabels.push({ column: week, label: MONTH_LABELS[previousMonth] });
    }
  }

  return { weeks: span, rows, monthLabels, total, activeDays, best, goal };
}

/**
 * The month strip above the grid, as one string.
 *
 * Built as a string rather than as positioned boxes because each cell is two
 * columns wide and a three-letter label spans one and a half of them; writing
 * into a character buffer is the only way to keep a label over its own column
 * without it pushing the next one along.
 */
export function monthStrip(grid: HeatmapGrid, cellWidth = 2): string {
  const width = grid.weeks * cellWidth;
  const buffer = new Array<string>(width).fill(' ');

  for (const { column, label } of grid.monthLabels) {
    const at = column * cellWidth;
    // Drop a label that would run off the end rather than truncating it to
    // something that reads as a different month.
    if (at + label.length > width) {
      continue;
    }
    // Skip one that would collide with the label before it.
    if (buffer.slice(Math.max(0, at - 1), at + label.length).some(character => character !== ' ')) {
      continue;
    }
    for (let index = 0; index < label.length; index++) {
      buffer[at + index] = label[index];
    }
  }

  return buffer.join('').trimEnd();
}
