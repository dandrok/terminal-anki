import { getFlashcardExtendedStats } from '../../features/flashcards/services/flashcard-service';
import { showAchievements } from '../../ui/views/achievements-view';

export async function handleShowAchievements(): Promise<void> {
  const stats = getFlashcardExtendedStats();
  await showAchievements(stats.achievements);
}
