import chalk from 'chalk';
import { select } from '@clack/prompts';
import { Achievement } from '../../features/flashcards/domain';
import { createProgressBar } from '../components/progress-bar';

export async function showAchievements(achievements: Achievement[]): Promise<void> {
  console.log(chalk.blue('\n◑ Achievements'));
  console.log(chalk.gray('-'.repeat(60)));

  const categories = {
    cards: achievements.filter(a => a.category === 'cards'),
    sessions: achievements.filter(a => a.category === 'sessions'),
    streaks: achievements.filter(a => a.category === 'streaks'),
    mastery: achievements.filter(a => a.category === 'mastery')
  };

  const categoryIcons = {
    cards: '◉',
    sessions: '◐',
    streaks: '◈',
    mastery: '◎'
  };

  Object.entries(categories).forEach(([category, categoryAchievements]) => {
    console.log(
      `\n${categoryIcons[category as keyof typeof categoryIcons]} ${category.charAt(0).toUpperCase() + category.slice(1)}:`
    );
    console.log(chalk.gray('-'.repeat(30)));

    categoryAchievements.forEach(achievement => {
      const unlocked = achievement.unlockedAt
        ? chalk.green(`${achievement.icon} ✓ ${achievement.name}`)
        : chalk.gray(`${achievement.icon} × ${achievement.name}`);

      const progress = `${achievement.progress.current}/${achievement.progress.required} ${achievement.progress.description}`;
      const progressBar = createProgressBar(
        achievement.progress.current,
        achievement.progress.required
      );

      console.log(`  ${unlocked}`);
      console.log(chalk.gray(`    ${achievement.description}`));
      if (!achievement.unlockedAt) {
        console.log(chalk.cyan(`    ${progressBar} ${progress}`));
      } else {
        console.log(
          chalk.green(`    ✦ Unlocked on ${new Date(achievement.unlockedAt!).toLocaleDateString()}`)
        );
      }
      console.log('');
    });
  });

  // Back to menu
  await select({
    message: '',
    options: [{ value: 'back', label: '◀ Back to main menu' }]
  });
}
