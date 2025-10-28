import chalk from 'chalk';
import { select, isCancel } from '@clack/prompts';
import { ExtendedStats } from '../../features/flashcards/domain';

export async function showMainMenu(stats: ExtendedStats): Promise<string> {
  const currentStreak = stats.learningStreak?.currentStreak || 0;
  const streakIcon = currentStreak >= 7 ? '◈' : currentStreak >= 3 ? '◊' : '◴';

  console.log(
    chalk.yellow(
      `
◉ Total cards: ${stats.totalCards} | ◳ Due today: ${stats.dueCards} | ${streakIcon} Streak: ${currentStreak} days`
    )
  );

  const action = await select({
    message: 'What would you like to do?',
    options: [
      { value: 'study', label: '◆ Study due cards' },
      { value: 'custom_study', label: '◎ Custom study session' },
      { value: 'add', label: '+ Add new card' },
      { value: 'list', label: '□ List all cards' },
      { value: 'search', label: '◉ Search cards' },
      { value: 'delete', label: '× Delete card' },
      { value: 'achievements', label: '◑ Achievements' },
      { value: 'analytics', label: '◰ Analytics & History' },
      { value: 'stats', label: '◈ Quick stats' },
      { value: 'exit', label: '◐ Exit' }
    ]
  });

  if (isCancel(action)) {
    return 'exit';
  }

  return action as string;
}
