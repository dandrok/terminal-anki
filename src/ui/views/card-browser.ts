import chalk from 'chalk';
import { select, isCancel } from '@clack/prompts';
import { Flashcard } from '../../features/flashcards/domain';

export async function browseCards(cards: Flashcard[]): Promise<void> {
  if (cards.length === 0) {
    console.log(chalk.yellow('◑ No flashcards found!'));
    return;
  }

  let currentIndex = 0;

  while (currentIndex < cards.length) {
    const card = cards[currentIndex];

    // Clear screen and show card header
    console.clear();
    console.log(
      chalk.blue(`
◉ Card Browser - ${currentIndex + 1}/${cards.length}`)
    );
    console.log(chalk.gray('-'.repeat(60)));

    // Show front of card
    console.log(chalk.cyan('\n? Front:'));
    console.log(chalk.white(`  ${card.front}`));

    // Show status info
    const isDue = card.nextReview <= new Date();
    const status = isDue ? chalk.red('◳ Due now') : chalk.green(`◴ Due in ${card.interval} days`);
    console.log(
      chalk.gray(
        `
Status: ${status} | Reviews: ${card.repetitions} | Easiness: ${card.easiness.toFixed(2)}`
      )
    );

    // Navigation options
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
      console.log(
        chalk.blue(`
◉ Card Browser - ${currentIndex + 1}/${cards.length}`)
      );
      console.log(chalk.gray('-'.repeat(60)));

      console.log(chalk.cyan('\n? Front:'));
      console.log(chalk.white(`  ${card.front}`));

      console.log(chalk.green('\n✓ Answer:'));
      console.log(chalk.white(`  ${card.back}`));

      console.log(
        chalk.gray(
          `
Status: ${status} | Reviews: ${card.repetitions} | Easiness: ${card.easiness.toFixed(2)}`
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
