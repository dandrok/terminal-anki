import { getAllCards, deleteCard } from '../../features/flashcards/services/flashcard-service';
import { deleteCardMenu } from '../../ui/views/delete-card-menu';
import { showSuccess, showError } from '../../ui/utils/cli-utils';

export async function handleDeleteCard(): Promise<void> {
  const cards = getAllCards();
  const cardId = await deleteCardMenu(cards);

  if (!cardId) {
    return;
  }

  const success = deleteCard(cardId);
  if (success) {
    showSuccess('Card deleted successfully!');
  } else {
    showError('Failed to delete card!');
  }
}
