import { chalk, icons, streakIcon } from '../theme.js';
import { CANCELLED, intro, outro, select, type Cancelled } from '../prompts.js';
import type { ExtendedStats } from '../../types/index.js';

export type MenuAction =
  | 'study'
  | 'custom_study'
  | 'add'
  | 'list'
  | 'search'
  | 'delete'
  | 'achievements'
  | 'analytics'
  | 'stats'
  | 'exit';

export function showIntro(): void {
  intro(chalk.cyan(`${icons.app} Terminal Anki - Flashcard Learning System`));
}

export function showOutro(): void {
  outro(chalk.green('Happy learning! Goodbye! ○'));
}

export function showHeader(stats: ExtendedStats): void {
  const streak = stats.learningStreak.currentStreak;
  console.log(
    chalk.yellow(
      `\n${icons.card} Total cards: ${stats.totalCards} | ` +
        `${icons.due} Due today: ${stats.dueCards} | ` +
        `${streakIcon(streak)} Streak: ${streak} days`
    )
  );
}

export async function showMainMenu(stats: ExtendedStats): Promise<MenuAction> {
  showHeader(stats);

  const action = await select<MenuAction>('What would you like to do?', [
    { value: 'study', label: `${icons.study} Study due cards` },
    { value: 'custom_study', label: `${icons.custom} Custom study session` },
    { value: 'add', label: `${icons.add} Add new card` },
    { value: 'list', label: `${icons.list} List all cards` },
    { value: 'search', label: `${icons.search} Search cards` },
    { value: 'delete', label: `${icons.remove} Delete card` },
    { value: 'achievements', label: `${icons.achievements} Achievements` },
    { value: 'analytics', label: `${icons.analytics} Analytics & History` },
    { value: 'stats', label: `${icons.stats} Quick stats` },
    { value: 'exit', label: `${icons.exit} Exit` }
  ]);

  return action === CANCELLED ? 'exit' : action;
}

export function isCancelled<T>(value: T | Cancelled): value is Cancelled {
  return value === CANCELLED;
}
