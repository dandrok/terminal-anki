import { FlashcardManager, type FlashcardManagerOptions } from '../services/flashcard-manager.js';
import { shuffle } from '../core/filters.js';
import { showError, showSuccess } from '../ui/messages.js';
import * as menu from '../ui/screens/menu.js';
import * as cardScreens from '../ui/screens/cards.js';
import * as studyScreens from '../ui/screens/study.js';
import * as progressScreens from '../ui/screens/progress.js';
import { pressBack, text, wasCancelled } from '../ui/prompts.js';
import type {
  CustomStudyFilters,
  Flashcard,
  SessionType,
  StudySessionRecord
} from '../types/index.js';

/** Wires the UI screens to the card manager. Holds no domain rules itself. */
export class TerminalAnki {
  private readonly cards: FlashcardManager;

  constructor(options: FlashcardManagerOptions = {}) {
    this.cards = new FlashcardManager(options);
  }

  async run(): Promise<void> {
    menu.showIntro();

    for (;;) {
      const action = await menu.showMainMenu(this.cards.getExtendedStats());

      if (action === 'exit') {
        menu.showOutro();
        return;
      }

      try {
        await this.dispatch(action);
      } catch (error) {
        showError(`An error occurred: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  private async dispatch(action: Exclude<menu.MenuAction, 'exit'>): Promise<void> {
    switch (action) {
      case 'study':
        return this.studyMode();
      case 'custom_study':
        return this.customStudyMode();
      case 'add':
        return this.addCard();
      case 'list':
        return this.listCards();
      case 'search':
        return this.searchCards();
      case 'delete':
        return this.deleteCard();
      case 'achievements':
        return progressScreens.showAchievements(this.cards.getExtendedStats().achievements);
      case 'analytics':
        return progressScreens.showAnalytics(this.cards.getExtendedStats());
      case 'stats':
        return progressScreens.showQuickStats(this.cards.getExtendedStats());
    }
  }

  async studyMode(): Promise<void> {
    const due = this.cards.getDueCards();
    if (due.length === 0) {
      showSuccess('No cards due for review! Great job!');
      return;
    }

    const length = await studyScreens.chooseSessionLength(due.length);
    if (length === null) {
      return;
    }

    await this.runSession(shuffle(due).slice(0, length), 'due');
  }

  private async customStudyMode(): Promise<void> {
    const filters = await studyScreens.customStudySetup(this.cards.getAllTags());
    if (!filters) {
      return;
    }

    // Every criterion is applied in one pass, so `dueOnly` actually takes effect.
    const selected = this.cards.getFilteredCards(filters);
    if (selected.length === 0) {
      showError('No cards match your filters!');
      return;
    }

    await this.runSession(selected, 'custom', filters);
  }

  private async runSession(
    sessionCards: Flashcard[],
    sessionType: SessionType,
    filters?: CustomStudyFilters
  ): Promise<void> {
    const startTime = new Date();
    const difficulties: number[] = [];
    let correctAnswers = 0;
    let studied = 0;
    let quitEarly = false;

    studyScreens.showSessionStart(
      sessionCards.length,
      sessionType === 'custom' ? 'custom' : sessionType
    );
    if (filters) {
      const description = studyScreens.describeFilters(filters);
      if (description) {
        console.log(description);
      }
    }

    for (const [index, card] of sessionCards.entries()) {
      studyScreens.showQuestion(card, index, sessionCards.length);

      const action = await studyScreens.askCardAction();
      if (action === 'quit') {
        quitEarly = true;
        break;
      }
      if (action === 'skip') {
        continue;
      }

      studyScreens.showAnswer(card);

      const grade = await studyScreens.askGrade();
      if (grade === 'quit') {
        quitEarly = true;
        break;
      }

      this.cards.reviewCard(card, grade);
      studied++;
      // Invert the grade so 0 is easiest and 5 is hardest.
      difficulties.push(5 - grade);
      if (grade >= 3) {
        correctAnswers++;
      }
    }

    const session: Omit<StudySessionRecord, 'id'> = {
      startTime,
      endTime: new Date(),
      cardsStudied: studied,
      correctAnswers,
      incorrectAnswers: studied - correctAnswers,
      averageDifficulty:
        difficulties.length > 0
          ? difficulties.reduce((sum, value) => sum + value, 0) / difficulties.length
          : 0,
      sessionType,
      customFilters: filters ? { tags: filters.tags, difficulty: filters.difficulty } : undefined,
      quitEarly
    };

    this.cards.recordStudySession(session);

    studyScreens.showSessionSummary({
      studied,
      skipped: sessionCards.length - studied,
      // Recounted from the collection rather than subtracted from the starting
      // total, so cards graded "Again" (due back in 10 minutes) are included.
      remainingDue: this.cards.getDueCards().length,
      quitEarly
    });
  }

  private async addCard(): Promise<void> {
    const input = await cardScreens.addCardForm();
    if (!input) {
      return;
    }
    this.cards.addCard(input.front, input.back, input.tags);
    showSuccess('Flashcard added successfully!');
  }

  private async listCards(): Promise<void> {
    const all = this.cards.getAllCards();
    if (all.length === 0) {
      showSuccess('No flashcards found!');
      return;
    }

    const view = await cardScreens.chooseListView(all.length);
    if (view === 'quick') {
      cardScreens.listCards(all);
      await pressBack();
    } else if (view === 'browse') {
      await cardScreens.browseCards(all);
    }
  }

  private async searchCards(): Promise<void> {
    const query = await text('◉ Search for:', { placeholder: 'Enter search terms...' });
    if (wasCancelled(query) || !query.trim()) {
      return;
    }
    await cardScreens.showSearchResults(this.cards.searchCards(query), query.trim());
  }

  private async deleteCard(): Promise<void> {
    const id = await cardScreens.chooseCardToDelete(this.cards.getAllCards());
    if (!id) {
      return;
    }
    if (this.cards.deleteCard(id)) {
      showSuccess('Card deleted successfully!');
    } else {
      showError('Failed to delete card!');
    }
  }
}
