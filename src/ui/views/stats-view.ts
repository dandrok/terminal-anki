import chalk from 'chalk';
import { select } from '@clack/prompts';
import { ExtendedStats } from '../../features/flashcards/domain';

export async function showStats(stats: ExtendedStats): Promise<void> {
  console.log(chalk.blue('\n◰ Quick Statistics'));
  console.log(chalk.gray('-'.repeat(40)));

  // Basic stats
  console.log(`◉ Total cards: ${stats.totalCards}`);
  console.log(`◳ Due today: ${stats.dueCards}`);
  console.log(`◶ Total reviews: ${stats.totalReviews}`);
  console.log(`◵ Average easiness: ${stats.averageEasiness.toFixed(2)}`);

  // Streak info
  const streakIcon =
    stats.learningStreak.currentStreak >= 7
      ? '◈'
      : stats.learningStreak.currentStreak >= 3
        ? '◊'
        : '◴';
  console.log(`${streakIcon} Current streak: ${stats.learningStreak.currentStreak} days`);

  // Achievement count
  const unlockedAchievements = stats.achievements.filter(a => a.unlockedAt).length;
  console.log(`◑ Achievements: ${unlockedAchievements}/${stats.achievements.length} unlocked`);

  console.log(chalk.blue('\n◰ Card Distribution:'));
  console.log(`  ${chalk.yellow('New (1 day)')}: ${stats.distribution.new} cards`);
  console.log(`  ${chalk.blue('Learning (2-7 days)')}: ${stats.distribution.learning} cards`);
  console.log(`  ${chalk.green('Young (1-4 weeks)')}: ${stats.distribution.young} cards`);
  console.log(`  ${chalk.magenta('Mature (1+ month)')}: ${stats.distribution.mature} cards`);

  // Recent achievement
  const recentAchievement = stats.achievements
    .filter(a => a.unlockedAt)
    .sort((a, b) => new Date(b.unlockedAt!).getTime() - new Date(a.unlockedAt!).getTime())[0];

  if (recentAchievement) {
    console.log(
      chalk.yellow(`\n★ Recent Achievement: ${recentAchievement.icon} ${recentAchievement.name}`)
    );
  }

  // Back to main menu button
  await select({
    message: '',
    options: [{ value: 'back', label: '◀ Back to main menu' }]
  });
}
