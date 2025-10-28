import chalk from 'chalk';
import { Flashcard } from '../../features/flashcards/domain';

export async function searchResults(cards: Flashcard[], query: string): Promise<void> {
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
