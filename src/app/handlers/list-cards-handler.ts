import { select, isCancel } from '@clack/prompts';
import { getAllCards } from '../../features/flashcards/services/flashcard-service';
import { listCards } from '../../ui/views/card-list';
import { browseCards } from '../../ui/views/card-browser';
import { showSuccess } from '../../ui/utils/cli-utils';

export async function handleListCardsOptions(): Promise<void> {
  const cards = getAllCards();

  if (cards.length === 0) {
    showSuccess('No flashcards found!');
    return;
  }

  console.log(`\n◷ ${cards.length} cards available\n`);

  const option = await select({
    message: 'How would you like to view your cards?',
    options: [
      { value: 'quick', label: '□ Quick List View' },
      { value: 'browse', label: '◉ Browse Cards One by One' },
      { value: 'back', label: '◀ Back to Main Menu' }
    ]
  });

  if (option === 'quick' || isCancel(option)) {
    await listCards(cards);
    // Back to main menu button after quick list
    await select({
      message: '',
      options: [{ value: 'back', label: '◀ Back to main menu' }]
    });
  } else if (option === 'browse') {
    await browseCards(cards);
  }
  // 'back' option returns to main menu automatically
}
