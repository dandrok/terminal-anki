import {
  accuracyColor,
  chalk,
  heading,
  icons,
  muted,
  progressBar,
  rule,
  streakIcon
} from '../theme.js';
import { pressBack } from '../prompts.js';
import { sessionAccuracy } from '../../core/stats.js';
import type { Achievement, AchievementCategory, ExtendedStats } from '../../types/index.js';

const CATEGORY_ICONS: Record<AchievementCategory, string> = {
  cards: '◉',
  sessions: '◐',
  streaks: '◈',
  mastery: '◎'
};

const CATEGORY_ORDER: AchievementCategory[] = ['cards', 'sessions', 'streaks', 'mastery'];

export async function showAchievements(achievements: readonly Achievement[]): Promise<void> {
  console.log(heading(`\n${icons.achievements} Achievements`));
  console.log(rule(60));

  for (const category of CATEGORY_ORDER) {
    const inCategory = achievements.filter(achievement => achievement.category === category);
    if (inCategory.length === 0) {
      continue;
    }

    console.log(
      `\n${CATEGORY_ICONS[category]} ${category.charAt(0).toUpperCase()}${category.slice(1)}:`
    );
    console.log(rule(30));

    for (const achievement of inCategory) {
      const title = achievement.unlockedAt
        ? chalk.green(`${achievement.icon} ${icons.success} ${achievement.name}`)
        : muted(`${achievement.icon} ${icons.remove} ${achievement.name}`);

      console.log(`  ${title}`);
      console.log(muted(`    ${achievement.description}`));

      if (achievement.unlockedAt) {
        console.log(
          chalk.green(
            `    ${icons.unlocked} Unlocked on ${achievement.unlockedAt.toLocaleDateString()}`
          )
        );
      } else {
        const { current, required, description } = achievement.progress;
        console.log(
          chalk.cyan(`    ${progressBar(current, required)} ${current}/${required} ${description}`)
        );
      }
      console.log('');
    }
  }

  await pressBack();
}

export async function showAnalytics(stats: ExtendedStats): Promise<void> {
  console.log(heading(`\n${icons.analytics} Learning Analytics & History`));
  console.log(rule(70));

  console.log(chalk.yellow(`\n${icons.tag} Learning Streak:`));
  console.log(`  Current streak: ${chalk.green(String(stats.learningStreak.currentStreak))} days`);
  console.log(`  Longest streak: ${chalk.green(String(stats.learningStreak.longestStreak))} days`);
  if (stats.learningStreak.lastStudyDate) {
    console.log(`  Last study: ${stats.learningStreak.lastStudyDate.toLocaleDateString()}`);
  }

  console.log(chalk.yellow(`\n${icons.easiness} Study Statistics:`));
  console.log(`  Total study time: ${chalk.blue(stats.totalStudyTime.toFixed(1))} minutes`);
  console.log(`  Sessions completed: ${chalk.green(String(stats.sessionsCompleted))}`);
  console.log(
    `  Average session length: ${chalk.blue(stats.averageSessionLength.toFixed(1))} minutes`
  );

  const tags = Object.entries(stats.tagDistribution).sort(([, a], [, b]) => b - a);
  if (tags.length > 0) {
    console.log(chalk.yellow(`\n${icons.tag} Tag Distribution:`));
    for (const [tag, count] of tags.slice(0, 10)) {
      const share = stats.totalCards > 0 ? ((count / stats.totalCards) * 100).toFixed(1) : '0.0';
      console.log(`  ${chalk.cyan(tag)}: ${count} cards (${share}%)`);
    }
  }

  console.log(chalk.yellow(`\n${icons.scheduled} Weekly Progress (Last 4 weeks):`));
  for (const week of stats.weeklyProgress) {
    const color = accuracyColor(week.accuracy);
    console.log(
      `  ${week.week}: ${chalk.blue(String(week.cardsStudied))} cards | ` +
        `${color(week.accuracy.toFixed(1))}% accuracy | ${week.sessionCount} sessions`
    );
  }

  if (stats.recentSessions.length > 0) {
    console.log(chalk.yellow(`\n${icons.cards} Recent Sessions:`));
    const recent = [...stats.recentSessions].slice(-5).reverse();
    recent.forEach((session, index) => {
      const label =
        session.sessionType === 'custom'
          ? `${icons.custom} Custom`
          : session.sessionType === 'all'
            ? `${icons.card} All`
            : `${icons.due} Due`;
      const quit = session.quitEarly ? chalk.red(' (Quit early)') : '';
      console.log(
        `  ${index + 1}. ${session.startTime.toLocaleDateString()} - ${label}: ` +
          `${session.cardsStudied} cards, ${sessionAccuracy(session).toFixed(1)}% accuracy${quit}`
      );
    });
  }

  await pressBack();
}

export async function showQuickStats(stats: ExtendedStats): Promise<void> {
  console.log(heading(`\n${icons.analytics} Quick Statistics`));
  console.log(rule(40));

  console.log(`${icons.card} Total cards: ${stats.totalCards}`);
  console.log(`${icons.due} Due today: ${stats.dueCards}`);
  console.log(`${icons.reviews} Total reviews: ${stats.totalReviews}`);
  console.log(`${icons.easiness} Average easiness: ${stats.averageEasiness.toFixed(2)}`);

  const streak = stats.learningStreak.currentStreak;
  console.log(`${streakIcon(streak)} Current streak: ${streak} days`);

  const unlocked = stats.achievements.filter(achievement => achievement.unlockedAt).length;
  console.log(
    `${icons.achievements} Achievements: ${unlocked}/${stats.achievements.length} unlocked`
  );

  console.log(heading(`\n${icons.analytics} Card Distribution:`));
  console.log(`  ${chalk.yellow('New (1 day)')}: ${stats.distribution.new} cards`);
  console.log(`  ${chalk.blue('Learning (2-7 days)')}: ${stats.distribution.learning} cards`);
  console.log(`  ${chalk.green('Young (1-4 weeks)')}: ${stats.distribution.young} cards`);
  console.log(`  ${chalk.magenta('Mature (1+ month)')}: ${stats.distribution.mature} cards`);

  const mostRecent = stats.achievements
    .filter((achievement): achievement is Achievement & { unlockedAt: Date } =>
      Boolean(achievement.unlockedAt)
    )
    .sort((a, b) => b.unlockedAt.getTime() - a.unlockedAt.getTime())[0];

  if (mostRecent) {
    console.log(
      chalk.yellow(`\n${icons.star} Recent Achievement: ${mostRecent.icon} ${mostRecent.name}`)
    );
  }

  await pressBack();
}
