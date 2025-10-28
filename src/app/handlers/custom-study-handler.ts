import {
  getAllTags,
  getFilteredCards,
  getAllCards,
  getCardsByDifficulty
} from '../../features/flashcards/services/flashcard-service';
import { customStudySessionSetup } from '../../ui/forms/custom-study-form';
import { showError } from '../../ui/utils/cli-utils';
import { runStudySession } from './session-handlers';

export async function handleCustomStudyMode(): Promise<void> {
  const allTags = getAllTags();
  const filters = await customStudySessionSetup(allTags);

  if (!filters) {
    return; // User cancelled
  }

  // Get filtered cards based on user selection
  let filteredCards;

  if (filters.tags && filters.tags.length > 0) {
    filteredCards = getFilteredCards(filters);
  } else if (filters.difficulty) {
    filteredCards = getCardsByDifficulty(filters.difficulty);
  } else {
    filteredCards = getAllCards();
  }

  // Apply additional filters
  if (filters.randomOrder) {
    filteredCards.sort(() => Math.random() - 0.5);
  }

  if (filters.limit && filters.limit > 0 && filters.limit < filteredCards.length) {
    filteredCards = filteredCards.slice(0, filters.limit);
  }

  if (filteredCards.length === 0) {
    showError('No cards match your filters!');
    return;
  }

  await runStudySession(filteredCards, filteredCards.length, 'custom', filters);
}
