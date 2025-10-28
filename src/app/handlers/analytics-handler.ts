import { getFlashcardExtendedStats } from '../../features/flashcards/services/flashcard-service';
import { showAnalytics } from '../../ui/views/analytics-view';

export async function handleShowAnalytics(): Promise<void> {
  const stats = getFlashcardExtendedStats();
  await showAnalytics(stats);
}
