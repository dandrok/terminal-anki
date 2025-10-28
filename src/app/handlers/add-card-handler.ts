import { addCard } from '../../features/flashcards/services/flashcard-service';
import { addCardForm } from '../../ui/forms/add-card-form';
import { showSuccess } from '../../ui/utils/cli-utils';

export async function handleAddCard(): Promise<void> {
  const cardData = await addCardForm();

  if (!cardData) {
    return;
  }

  addCard(cardData.front, cardData.back, cardData.tags);
  showSuccess('Flashcard added successfully!');
}
