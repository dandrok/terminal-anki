import { getFlashcardExtendedStats } from '../../features/flashcards/services/flashcard-service';
import { showStats } from '../../ui/views/stats-view';

export async function handleShowStatistics(): Promise<void> {
  const stats = getFlashcardExtendedStats();
  await showStats(stats);
}
