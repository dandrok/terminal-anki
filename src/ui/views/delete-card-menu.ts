import chalk from 'chalk';
import { select, isCancel } from '@clack/prompts';
import { Flashcard } from '../../features/flashcards/domain';

export async function deleteCardMenu(cards: Flashcard[]): Promise<string | null> {
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
