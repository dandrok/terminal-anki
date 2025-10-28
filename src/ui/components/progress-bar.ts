import chalk from 'chalk';

export const createProgressBar = (current: number, total: number, width: number = 20): string => {
  // Ensure we have valid numbers
  const safeCurrent = Math.max(0, current || 0);
  const safeTotal = Math.max(1, total || 1);

  const percentage = safeCurrent / safeTotal;
  const filled = Math.min(width, Math.max(0, Math.floor(percentage * width)));
  const empty = Math.max(0, width - filled);
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  return chalk.cyan(`[${bar}]`);
};
