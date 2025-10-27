import chalk from 'chalk';
import ora from 'ora';
import { intro, outro, select, text, confirm, multiselect, isCancel } from '@clack/prompts';
import { Flashcard, Achievement, ExtendedStats, CustomStudyFilters } from './types.js';

export class UIManager {
  showIntro(): void {
    intro(chalk.cyan('※ Terminal Anki - Flashcard Learning System'));
  }

  showOutro(): void {
    outro(chalk.green('Happy learning! Goodbye! ○'));
  }

  async showMainMenu(stats: any): Promise<string> {
    const currentStreak = stats.learningStreak?.currentStreak || 0;
    const streakIcon = currentStreak >= 7 ? '◈' : currentStreak >= 3 ? '◊' : '◴';

    console.log(
      chalk.yellow(
        `\n◉ Total cards: ${stats.totalCards} | ◳ Due today: ${stats.dueCards} | ${streakIcon} Streak: ${currentStreak} days`
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

  async addCardForm(): Promise<{ front: string; back: string; tags: string[] } | null> {
    console.log(chalk.blue('\n+ Add New Flashcard'));
    console.log(chalk.gray('-'.repeat(30)));

    const front = await text({
      message: 'Front (Question):',
      placeholder: 'Enter the question...'
    });

    if (isCancel(front) || !front) {
      return null;
    }

    const back = await text({
      message: 'Back (Answer):',
      placeholder: 'Enter the answer...'
    });

    if (isCancel(back) || !back) {
      return null;
    }

    const tagsInput = await text({
      message: 'Tags (comma-separated, optional):',
      placeholder: 'e.g., programming, javascript, basics'
    });

    if (isCancel(tagsInput)) {
      return null;
    }

    // Parse tags from comma-separated input
    const tags = ((tagsInput as string) || '')
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);

    return { front: front as string, back: back as string, tags };
  }

  async listCards(cards: Flashcard[]): Promise<void> {
    if (cards.length === 0) {
      console.log(chalk.yellow('◑ No flashcards found!'));
      return;
    }

    console.log(chalk.blue(`\n◷ All Flashcards (${cards.length} total)`));
    console.log(chalk.gray('-'.repeat(80)));

    cards.forEach((card, index) => {
      const isDue = card.nextReview <= new Date();
      const status = isDue ? chalk.red('◳ Due') : chalk.green(`◴ In ${card.interval} days`);

      const frontText = card.front.length > 30 ? card.front.substring(0, 30) + '...' : card.front;
      const backText = card.back.length > 30 ? card.back.substring(0, 30) + '...' : card.back;
      const tagsText =
        card.tags.length > 0 ? chalk.cyan(`◈ ${card.tags.join(', ')}`) : chalk.gray('◈ No tags');

      console.log(`${index + 1}. [${status}] ${chalk.white(frontText)} → ${chalk.gray(backText)}`);
      console.log(`     ${tagsText}`);
    });

    console.log('\n');
  }

  async browseCards(cards: Flashcard[]): Promise<void> {
    if (cards.length === 0) {
      console.log(chalk.yellow('◑ No flashcards found!'));
      return;
    }

    let currentIndex = 0;

    while (currentIndex < cards.length) {
      const card = cards[currentIndex];

      // Clear screen and show card header
      console.clear();
      console.log(chalk.blue(`\n◉ Card Browser - ${currentIndex + 1}/${cards.length}`));
      console.log(chalk.gray('-'.repeat(60)));

      // Show front of card
      console.log(chalk.cyan('\n? Front:'));
      console.log(chalk.white(`  ${card.front}`));

      // Show status info
      const isDue = card.nextReview <= new Date();
      const status = isDue ? chalk.red('◳ Due now') : chalk.green(`◴ Due in ${card.interval} days`);
      console.log(
        chalk.gray(
          `\nStatus: ${status} | Reviews: ${card.repetitions} | Easiness: ${card.easiness.toFixed(2)}`
        )
      );

      // Navigation options
      const { select } = await import('@clack/prompts');
      const action = await select({
        message: '\nWhat would you like to do?',
        options: [
          { value: 'showAnswer', label: '◉ Show Answer' },
          { value: 'next', label: '▶ Next Card' },
          { value: 'previous', label: '◀ Previous Card' },
          { value: 'back', label: '◀ Back to Main Menu' }
        ]
      });

      if (action === 'back' || isCancel(action)) {
        break;
      }

      if (action === 'showAnswer') {
        // Show answer with same card header
        console.clear();
        console.log(chalk.blue(`\n◉ Card Browser - ${currentIndex + 1}/${cards.length}`));
        console.log(chalk.gray('-'.repeat(60)));

        console.log(chalk.cyan('\n? Front:'));
        console.log(chalk.white(`  ${card.front}`));

        console.log(chalk.green('\n✓ Answer:'));
        console.log(chalk.white(`  ${card.back}`));

        console.log(
          chalk.gray(
            `\nStatus: ${status} | Reviews: ${card.repetitions} | Easiness: ${card.easiness.toFixed(2)}`
          )
        );

        const continueAction = await select({
          message: '\nContinue?',
          options: [
            { value: 'next', label: '▶ Next Card' },
            { value: 'previous', label: '◀ Previous Card' },
            { value: 'back', label: '◀ Back to Main Menu' }
          ]
        });

        if (continueAction === 'back' || isCancel(continueAction)) {
          break;
        } else if (continueAction === 'next') {
          currentIndex++;
        } else if (continueAction === 'previous') {
          currentIndex = Math.max(0, currentIndex - 1);
        }
      } else if (action === 'next') {
        currentIndex++;
      } else if (action === 'previous') {
        currentIndex = Math.max(0, currentIndex - 1);
      }
    }
  }

  async searchResults(cards: Flashcard[], query: string): Promise<void> {
    if (cards.length === 0) {
      console.log(chalk.yellow(`◑ No cards found for "${query}"`));
      return;
    }

    console.log(chalk.blue(`\n◷ Found ${cards.length} matching cards:`));
    console.log(chalk.gray('-'.repeat(60)));

    cards.forEach((card, index) => {
      const isDue = card.nextReview <= new Date();
      const status = isDue ? chalk.red('◳ Due') : chalk.green(`◴ In ${card.interval} days`);

      console.log(`${index + 1}. ${chalk.white(card.front)} → ${chalk.gray(card.back)}`);
      console.log(`   Status: ${status}`);
    });
  }

  async deleteCard(cards: Flashcard[]): Promise<string | null> {
    if (cards.length === 0) {
      console.log(chalk.yellow('◑ No flashcards to delete!'));
      return null;
    }

    const options = cards.map((card, index) => ({
      value: card.id,
      label: `${index + 1}. ${card.front} → ${card.back}`
    }));

    options.unshift({ value: 'cancel', label: '× Cancel' });

    const selectedId = await select({
      message: 'Select a card to delete:',
      options
    });

    if (isCancel(selectedId) || selectedId === 'cancel') {
      return null;
    }

    return selectedId as string;
  }

  async showStats(stats: any): Promise<void> {
    console.log(chalk.blue('\n◰ Learning Statistics'));
    console.log(chalk.gray('-'.repeat(40)));
    console.log(`◉ Total cards: ${stats.totalCards}`);
    console.log(`◳ Due today: ${stats.dueCards}`);
    console.log(`◶ Total reviews: ${stats.totalReviews}`);
    console.log(`◵ Average easiness: ${stats.averageEasiness.toFixed(2)}`);

    console.log(chalk.blue('\n◰ Card Distribution:'));
    console.log(`  ${chalk.yellow('New (1 day)')}: ${stats.distribution.new} cards`);
    console.log(`  ${chalk.blue('Learning (2-7 days)')}: ${stats.distribution.learning} cards`);
    console.log(`  ${chalk.green('Young (1-4 weeks)')}: ${stats.distribution.young} cards`);
    console.log(`  ${chalk.magenta('Mature (1+ month)')}: ${stats.distribution.mature} cards`);

    console.log('\n');

    // Back to main menu button
    const { select } = await import('@clack/prompts');
    await select({
      message: '',
      options: [{ value: 'back', label: '◀ Back to main menu' }]
    });
  }

  showSuccess(message: string): void {
    console.log(chalk.green(`✓ ${message}`));
  }

  showError(message: string): void {
    console.log(chalk.red(`× ${message}`));
  }

  showSpinner(message: string): any {
    return ora(message).start();
  }

  async pause(): Promise<void> {
    await confirm({
      message: 'Press Enter to continue...'
    });
  }

  // v1.2.0 Custom Study Session UI
  async customStudySessionSetup(allTags: string[]): Promise<CustomStudyFilters | null> {
    console.log(chalk.blue('\n◎ Custom Study Session Setup'));
    console.log(chalk.gray('-'.repeat(50)));

    const sessionType = await select({
      message: 'Choose study type:',
      options: [
        { value: 'due', label: '◳ Study due cards (with filters)' },
        { value: 'all', label: '◉ Study all cards (with filters)' },
        { value: 'tags', label: '◈ Study by tags' },
        { value: 'difficulty', label: '◵ Study by difficulty level' },
        { value: 'cancel', label: '× Cancel' }
      ]
    });

    if (isCancel(sessionType) || sessionType === 'cancel') {
      return null;
    }

    const filters: CustomStudyFilters = {};

    // Tag selection - only show for "Study by tags" option
    if (sessionType === 'tags') {
      const selectedTags = await multiselect({
        message: 'Select tags:',
        options: allTags.map(tag => ({ value: tag, label: `◈ ${tag}` })),
        required: true
      });

      if (!isCancel(selectedTags) && selectedTags && selectedTags.length > 0) {
        filters.tags = selectedTags as string[];
      }
    } else {
      // For "due" and "all" session types, allow optional tag filtering
      const optionalTags = await multiselect({
        message: 'Filter by tags (optional):',
        options: allTags.map(tag => ({ value: tag, label: `◈ ${tag}` })),
        required: false
      });

      if (!isCancel(optionalTags) && optionalTags && optionalTags.length > 0) {
        filters.tags = optionalTags as string[];
      }
    }

    // Difficulty selection
    if (sessionType === 'difficulty' || (sessionType as string) !== 'tags') {
      const difficulty = await select({
        message: 'Select difficulty (optional):',
        options: [
          { value: undefined, label: '◰ All difficulties' },
          { value: 'new', label: '◰ New cards (≤1 day)' },
          { value: 'learning', label: '◐ Learning (2-7 days)' },
          { value: 'young', label: '◉ Young (8-30 days)' },
          { value: 'mature', label: '◊ Mature (>30 days)' }
        ]
      });

      if (!isCancel(difficulty) && difficulty) {
        filters.difficulty = difficulty as 'new' | 'learning' | 'young' | 'mature';
      }
    }

    // Session limit
    const limitChoice = await select({
      message: 'Number of cards:',
      options: [
        { value: undefined, label: '◰ All matching cards' },
        { value: 10, label: '◐ Quick (10 cards)' },
        { value: 25, label: '◈ Standard (25 cards)' },
        { value: 50, label: '◆ Intensive (50 cards)' },
        { value: 'custom', label: '◉ Custom number' }
      ]
    });

    if (isCancel(limitChoice)) {
      return null;
    }

    if (limitChoice === 'custom') {
      const customLimit = await text({
        message: 'Enter number of cards:',
        placeholder: '1-100',
        validate: value => {
          const num = parseInt(value);
          if (isNaN(num) || num < 1 || num > 100) {
            return 'Please enter a number between 1 and 100';
          }
          return undefined;
        }
      });

      if (!isCancel(customLimit) && customLimit) {
        filters.limit = parseInt(customLimit as string);
      }
    } else if (limitChoice !== undefined) {
      filters.limit = limitChoice as number;
    }

    // Random order
    const randomOrder = await confirm({
      message: 'Randomize card order?',
      initialValue: true
    });

    if (!isCancel(randomOrder)) {
      filters.randomOrder = randomOrder as boolean;
    }

    return filters;
  }

  // Achievements UI
  async showAchievements(achievements: Achievement[]): Promise<void> {
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
        const progressBar = this.createProgressBar(
          achievement.progress.current,
          achievement.progress.required
        );

        console.log(`  ${unlocked}`);
        console.log(chalk.gray(`    ${achievement.description}`));
        if (!achievement.unlockedAt) {
          console.log(chalk.cyan(`    ${progressBar} ${progress}`));
        } else {
          console.log(
            chalk.green(
              `    ✦ Unlocked on ${new Date(achievement.unlockedAt!).toLocaleDateString()}`
            )
          );
        }
        console.log('');
      });
    });

    // Back to menu
    const { select } = await import('@clack/prompts');
    await select({
      message: '',
      options: [{ value: 'back', label: '◀ Back to main menu' }]
    });
  }

  // Analytics Dashboard UI
  async showAnalytics(stats: ExtendedStats): Promise<void> {
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
        `  ${week.week}: ${chalk.blue(week.cardsStudied)} cards | ${accuracyColor(week.accuracy.toFixed(1))}% accuracy | ${week.sessionCount} sessions`
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
    const { select } = await import('@clack/prompts');
    await select({
      message: '',
      options: [{ value: 'back', label: '◀ Back to main menu' }]
    });
  }

  // Enhanced stats display with v1.2.0 features
  async showEnhancedStats(stats: ExtendedStats): Promise<void> {
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
    const { select } = await import('@clack/prompts');
    await select({
      message: '',
      options: [{ value: 'back', label: '◀ Back to main menu' }]
    });
  }

  // Utility method for progress bars
  private createProgressBar(current: number, total: number, width: number = 20): string {
    // Ensure we have valid numbers
    const safeCurrent = Math.max(0, current || 0);
    const safeTotal = Math.max(1, total || 1);

    const percentage = safeCurrent / safeTotal;
    const filled = Math.min(width, Math.max(0, Math.floor(percentage * width)));
    const empty = Math.max(0, width - filled);
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    return chalk.cyan(`[${bar}]`);
  }

  // Tag selection for card editing
  async editCardTags(currentTags: string[], allTags: string[]): Promise<string[] | null> {
    console.log(chalk.blue('\n◈ Edit Card Tags'));
    console.log(chalk.gray('-'.repeat(30)));
    console.log(`Current tags: ${currentTags.length > 0 ? currentTags.join(', ') : 'No tags'}`);

    const option = await select({
      message: 'What would you like to do?',
      options: [
        { value: 'select', label: '◈ Choose from existing tags' },
        { value: 'add', label: '+ Add new tags' },
        { value: 'remove', label: '- Remove all tags' },
        { value: 'keep', label: '✓ Keep current tags' },
        { value: 'cancel', label: '× Cancel' }
      ]
    });

    if (isCancel(option) || option === 'cancel' || option === 'keep') {
      return null;
    }

    if (option === 'remove') {
      return [];
    }

    if (option === 'select') {
      const selectedTags = await multiselect({
        message: 'Select tags:',
        options: allTags.map(tag => ({
          value: tag,
          label: tag
        })),
        initialValues: currentTags
      });

      if (isCancel(selectedTags)) {
        return null;
      }

      return selectedTags as string[];
    }

    if (option === 'add') {
      const newTags = await text({
        message: 'Enter new tags (comma-separated):',
        placeholder: 'tag1, tag2, tag3'
      });

      if (isCancel(newTags) || !newTags) {
        return null;
      }

      const parsedTags = (newTags as string)
        .split(',')
        .map(tag => tag.trim().toLowerCase())
        .filter(tag => tag.length > 0);

      return [...new Set([...currentTags, ...parsedTags])];
    }

    return null;
  }
}
