import chalk from 'chalk';
import { select } from '@clack/prompts';
import { ExtendedStats } from '../../features/flashcards/domain';

export async function showAnalytics(stats: ExtendedStats): Promise<void> {
  console.log(chalk.blue('\n◰ Learning Analytics & History'));
  console.log(chalk.gray('-'.repeat(70)));

  // Learning streak section
  console.log(chalk.yellow('\n◈ Learning Streak:'));
  console.log(`  Current streak: ${chalk.green(stats.learningStreak.currentStreak)} days`);
  console.log(`  Longest streak: ${chalk.green(stats.learningStreak.longestStreak)} days`);
  if (stats.learningStreak.lastStudyDate) {
    console.log(`  Last study: ${stats.learningStreak.lastStudyDate.toLocaleDateString()}`);
  }

  // Study statistics
  console.log(chalk.yellow('\n◵ Study Statistics:'));
  console.log(`  Total study time: ${chalk.blue(stats.totalStudyTime.toFixed(1))} minutes`);
  console.log(`  Sessions completed: ${chalk.green(stats.sessionsCompleted)}`);
  console.log(
    `  Average session length: ${chalk.blue(stats.averageSessionLength.toFixed(1))} minutes`
  );

  // Tag distribution
  if (Object.keys(stats.tagDistribution).length > 0) {
    console.log(chalk.yellow('\n◈ Tag Distribution:'));
    Object.entries(stats.tagDistribution)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10) // Show top 10 tags
      .forEach(([tag, count]) => {
        const percentage = ((count / stats.totalCards) * 100).toFixed(1);
        console.log(`  ${chalk.cyan(tag)}: ${count} cards (${percentage}%)`);
      });
  }

  // Weekly progress
  console.log(chalk.yellow('\n◴ Weekly Progress (Last 4 weeks):'));
  stats.weeklyProgress.forEach(week => {
    const accuracyColor =
      week.accuracy >= 80 ? chalk.green : week.accuracy >= 60 ? chalk.yellow : chalk.red;
    console.log(
      `  ${week.week}: ${chalk.blue(week.cardsStudied)} cards | ${accuracyColor(
        week.accuracy.toFixed(1)
      )}% accuracy | ${week.sessionCount} sessions`
    );
  });

  // Recent sessions
  if (stats.recentSessions.length > 0) {
    console.log(chalk.yellow('\n◷ Recent Sessions:'));
    stats.recentSessions
      .slice(-5)
      .reverse()
      .forEach((session, index) => {
        const accuracy =
          session.cardsStudied > 0
            ? ((session.correctAnswers / session.cardsStudied) * 100).toFixed(1)
            : '0.0';
        const date = session.startTime.toLocaleDateString();
        const sessionType =
          session.sessionType === 'custom'
            ? '◎ Custom'
            : session.sessionType === 'all'
              ? '◉ All'
              : '◳ Due';
        const quitStatus = session.quitEarly ? chalk.red(' (Quit early)') : '';

        console.log(
          `  ${index + 1}. ${date} - ${sessionType}: ${session.cardsStudied} cards, ${accuracy}% accuracy${quitStatus}`
        );
      });
  }

  // Back to menu
  await select({
    message: '',
    options: [{ value: 'back', label: '◀ Back to main menu' }]
  });
}
