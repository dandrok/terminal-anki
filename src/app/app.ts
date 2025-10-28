import { showIntro, showOutro, showError } from '../ui/utils/cli-utils';
import { showMainMenu } from '../ui/views/main-menu';
import { getFlashcardExtendedStats } from '../features/flashcards/services/flashcard-service';
import {
  handleAddCard,
  handleStudyMode,
  handleCustomStudyMode,
  handleListCardsOptions,
  handleSearchCards,
  handleDeleteCard,
  handleShowAchievements,
  handleShowAnalytics,
  handleShowStatistics
} from './handlers';

export async function runApplication(): Promise<void> {
  showIntro();

  while (true) {
    const stats = getFlashcardExtendedStats();
    const action = await showMainMenu(stats);

    try {
      switch (action) {
        case 'study':
          await handleStudyMode();
          break;
        case 'custom_study':
          await handleCustomStudyMode();
          break;
        case 'add':
          await handleAddCard();
          break;
        case 'list':
          await handleListCardsOptions();
          break;
        case 'search':
          await handleSearchCards();
          break;
        case 'delete':
          await handleDeleteCard();
          break;
        case 'achievements':
          await handleShowAchievements();
          break;
        case 'analytics':
          await handleShowAnalytics();
          break;
        case 'stats':
          await handleShowStatistics();
          break;
        case 'exit':
          showOutro();
          return;
        default:
          showError('Invalid option! Please try again.');
      }
    } catch (error) {
      showError(`An error occurred: ${error}`);
    }
  }
}
