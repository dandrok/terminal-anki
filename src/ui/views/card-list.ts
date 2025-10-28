import chalk from 'chalk';
import { Flashcard } from '../../features/flashcards/domain';

export async function listCards(cards: Flashcard[]): Promise<void> {
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
