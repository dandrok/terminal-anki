import chalk from 'chalk';

/** Glyphs used across the interface, kept in one place for consistency. */
export const icons = {
  app: '※',
  card: '◉',
  cards: '◷',
  due: '◳',
  scheduled: '◴',
  study: '◆',
  custom: '◎',
  add: '+',
  list: '□',
  search: '◉',
  remove: '×',
  achievements: '◑',
  analytics: '◰',
  stats: '◈',
  exit: '◐',
  tag: '◈',
  back: '◀',
  next: '▶',
  success: '✓',
  star: '★',
  unlocked: '✦',
  easiness: '◵',
  reviews: '◶'
} as const;

export const rule = (width = 60): string => chalk.gray('-'.repeat(width));
export const heading = (text: string): string => chalk.blue(text);
export const muted = (text: string): string => chalk.gray(text);
export const highlight = (text: string): string => chalk.cyan(text);

/** Streak glyph, stepping up as the streak gets longer. */
export function streakIcon(days: number): string {
  if (days >= 7) {
    return '◈';
  }
  return days >= 3 ? '◊' : '◴';
}

/** Colour an accuracy percentage: green good, yellow fair, red poor. */
export function accuracyColor(accuracy: number): (text: string) => string {
  if (accuracy >= 80) {
    return chalk.green;
  }
  return accuracy >= 60 ? chalk.yellow : chalk.red;
}

/** Shorten a string for single-line list rendering. */
export function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

export function progressBar(current: number, total: number, width = 20): string {
  const safeCurrent = Math.max(0, Number.isFinite(current) ? current : 0);
  const safeTotal = Math.max(1, Number.isFinite(total) ? total : 1);
  const filled = Math.min(width, Math.max(0, Math.floor((safeCurrent / safeTotal) * width)));
  return chalk.cyan(`[${'█'.repeat(filled)}${'░'.repeat(width - filled)}]`);
}

export { chalk };
