#!/usr/bin/env node

import { FlashcardManager } from './flashcard.js';
import { UIManager } from './ui.js';
import { Flashcard, ReviewQuality, StudySessionRecord, CustomStudyFilters } from './types.js';
import { isCancel } from '@clack/prompts';

class TerminalAnki {
  private cardManager: FlashcardManager;
  private ui: UIManager;

  constructor() {
    this.cardManager = new FlashcardManager();
    this.ui = new UIManager();
  }

  async run(): Promise<void> {
    this.ui.showIntro();

    while (true) {
      const stats = this.cardManager.getExtendedStats();
      const action = await this.ui.showMainMenu(stats);

      try {
        switch (action) {
          case 'study':
            await this.studyMode();
            break;
          case 'custom_study':
            await this.customStudyMode();
            break;
          case 'add':
            await this.addCard();
            break;
          case 'list':
            await this.listCardsOptions();
            break;
          case 'search':
            await this.searchCards();
            break;
          case 'delete':
            await this.deleteCard();
            break;
          case 'achievements':
            await this.showAchievements();
            break;
          case 'analytics':
            await this.showAnalytics();
            break;
          case 'stats':
            await this.showStatistics();
            break;
          case 'exit':
            this.ui.showOutro();
            return;
          default:
            this.ui.showError('Invalid option! Please try again.');
        }
      } catch (error) {
        this.ui.showError(`An error occurred: ${error}`);
      }

      if (action !== 'exit') {
        // No more pause - direct menu navigation
      }
    }
  }

  async studyMode(): Promise<void> {
    const dueCards = this.cardManager.getDueCards();

    if (dueCards.length === 0) {
      this.ui.showSuccess('No cards due for review! Great job!');
      return;
    }

    // Session setup
    const sessionLength = await this.setupStudySession(dueCards.length);
    if (!sessionLength) return; // User cancelled

    // Select cards for this session
    const shuffled = [...dueCards].sort(() => Math.random() - 0.5);
    const sessionCards = shuffled.slice(0, sessionLength);

    await this.runStudySession(sessionCards, dueCards.length, 'due');
  }

  private async setupStudySession(totalDueCards: number): Promise<number | null> {
    const { select } = await import('@clack/prompts');

    console.log(`\n◉ ${totalDueCards} cards due today\n`);

    const sessionType = await select({
      message: 'Study options:',
      options: [
        { value: 'all', label: `◆ Study all due cards (${totalDueCards})` },
        { value: 'limited', label: '◈ Study limited session' },
        { value: 'cancel', label: '◐ Cancel' }
      ]
    });

    if (sessionType === 'cancel' || isCancel(sessionType)) {
      return null;
    }

    if (sessionType === 'all') {
      return totalDueCards;
    }

    // Limited session options
    const limitedOption = await select({
      message: 'Choose session length:',
      options: [
        { value: 10, label: '◐ Quick session (10 cards)' },
        { value: 25, label: '◈ Standard session (25 cards)' },
        { value: 50, label: '◆ Intensive session (50 cards)' },
        { value: 'custom', label: '◉ Custom number' },
        { value: 'back', label: '◀ Back to study options' }
      ]
    });

    if (isCancel(limitedOption)) {
      return null;
    }

    if (limitedOption === 'back') {
      // Recursively call to go back to study options
      return this.setupStudySession(totalDueCards);
    }

    if (limitedOption === 'custom') {
      const { text } = await import('@clack/prompts');

      while (true) {
        const customNumber = await text({
          message: 'Enter number of cards:',
          placeholder: '1-100',
          validate: value => {
            const num = parseInt(value);
            if (isNaN(num) || num < 1 || num > 100) {
              return 'Please enter a number between 1 and 100';
            }
            return undefined;
          }
        });

        if (isCancel(customNumber)) {
          return this.setupStudySession(totalDueCards); // Go back to session length options
        }

        return parseInt(customNumber as string);
      }
    }

    return limitedOption as number;
  }

  private async runStudySession(
    sessionCards: Flashcard[],
    totalAvailableCards: number,
    sessionType: 'due' | 'custom' | 'all',
    customFilters?: CustomStudyFilters
  ): Promise<void> {
    const startTime = new Date();
    let correctAnswers = 0;
    let studiedCount = 0;
    let quitEarly = false;
    const totalDifficulty: number[] = [];

    console.log(
      `\n◐ Starting ${sessionType === 'custom' ? 'custom' : sessionType} study session with ${sessionCards.length} cards...`
    );
    console.log('-'.repeat(50));

    for (let i = 0; i < sessionCards.length; i++) {
      const card = sessionCards[i];

      // Show question
      console.log(`\n○ Card ${i + 1}/${sessionCards.length}`);
      console.log(`Question: ${card.front}`);

      // Wait for user to show answer or quit
      const shouldContinue = await this.waitForAnswer(card, i, sessionCards.length);
      if (shouldContinue === 'quit') {
        quitEarly = true;
        break;
      } else if (shouldContinue === 'skip') {
        continue;
      }

      // Show answer
      console.log(`\nAnswer: ${card.back}`);

      // Get difficulty rating
      const rating = await this.getDifficultyRating(card, i, sessionCards.length);
      if (rating === 'quit') {
        quitEarly = true;
        break;
      } else {
        this.cardManager.updateSpacedRepetition(card, rating);
        studiedCount++;
        totalDifficulty.push(5 - rating); // Invert for difficulty calculation (0=hardest, 5=easiest)

        if (rating >= 3) {
          correctAnswers++;
        }
      }
    }

    // Record session data
    const endTime = new Date();
    const averageDifficulty =
      totalDifficulty.length > 0
        ? totalDifficulty.reduce((a, b) => a + b, 0) / totalDifficulty.length
        : 0;

    const sessionData: Omit<StudySessionRecord, 'id'> = {
      startTime,
      endTime,
      cardsStudied: studiedCount,
      correctAnswers,
      incorrectAnswers: studiedCount - correctAnswers,
      averageDifficulty,
      sessionType,
      customFilters: customFilters
        ? {
            tags: customFilters.tags,
            difficulty: customFilters.difficulty
          }
        : undefined,
      quitEarly
    };

    this.cardManager.recordStudySession(sessionData);

    // Show session summary
    this.showSessionSummary(
      studiedCount,
      sessionCards.length - studiedCount,
      totalAvailableCards - studiedCount,
      quitEarly
    );
  }

  private async waitForAnswer(
    _card: Flashcard,
    _currentIndex: number,
    _totalCards: number
  ): Promise<'show' | 'quit' | 'skip'> {
    const { select } = await import('@clack/prompts');

    console.log('\nChoose your action:');

    const action = await select({
      message: '',
      options: [
        { value: 'show', label: '◉ Show Answer' },
        { value: 'skip', label: '◐ Skip Card' },
        { value: 'quit', label: '× Quit Session' }
      ]
    });

    if (isCancel(action)) {
      return 'quit';
    }

    return action as 'show' | 'quit' | 'skip';
  }

  private async getDifficultyRating(
    _card: Flashcard,
    _currentIndex: number,
    _totalCards: number
  ): Promise<ReviewQuality | 'quit'> {
    const { select } = await import('@clack/prompts');

    const difficulty = await select({
      message: 'How well did you know this?',
      options: [
        { value: 0, label: '× Again (0) - Show card soon' },
        { value: 1, label: '◐ Hard (1)' },
        { value: 3, label: '◑ Good (3)' },
        { value: 4, label: '◒ Easy (4)' },
        { value: 'quit', label: '× Quit Session' }
      ]
    });

    if (isCancel(difficulty)) {
      return 'quit';
    }

    // Handle quit option separately since return type differs
    if (difficulty === 'quit') {
      return 'quit';
    }

    return difficulty as ReviewQuality;
  }

  private showSessionSummary(
    studiedCount: number,
    remainingInSession: number,
    totalRemainingDue: number,
    quitEarly: boolean
  ): void {
    console.log('\n' + '='.repeat(50));
    console.log('◎ Session Summary');
    console.log('='.repeat(50));
    console.log(`✓ Studied: ${studiedCount} cards`);
    if (quitEarly) {
      console.log(`◰ Skipped in session: ${remainingInSession} cards`);
    }
    console.log(`◉ Remaining due today: ${totalRemainingDue} cards`);
    console.log('◈ Progress saved automatically');

    if (quitEarly) {
      console.log('\n○ See you next time!');
    } else {
      console.log('\n★ Great job! Keep up the good work!');
    }
    console.log('='.repeat(50));
  }

  private async addCard(): Promise<void> {
    const cardData = await this.ui.addCardForm();

    if (!cardData) {
      return;
    }

    this.cardManager.addCard(cardData.front, cardData.back, cardData.tags);
    this.ui.showSuccess('Flashcard added successfully!');
  }

  private async listCardsOptions(): Promise<void> {
    const { select } = await import('@clack/prompts');
    const cards = this.cardManager.getAllCards();

    if (cards.length === 0) {
      this.ui.showSuccess('No flashcards found!');
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
      await this.ui.listCards(cards);
      // Back to main menu button after quick list
      const { select } = await import('@clack/prompts');
      await select({
        message: '',
        options: [{ value: 'back', label: '◀ Back to main menu' }]
      });
    } else if (option === 'browse') {
      await this.ui.browseCards(cards);
    }
    // 'back' option returns to main menu automatically
  }

  private async listCards(): Promise<void> {
    const cards = this.cardManager.getAllCards();
    await this.ui.listCards(cards);
  }

  private async searchCards(): Promise<void> {
    const { text } = await import('@clack/prompts');

    const query = await text({
      message: '◉ Search for:',
      placeholder: 'Enter search terms...'
    });

    if (!query || isCancel(query)) {
      return;
    }

    const results = this.cardManager.searchCards(query as string);
    await this.ui.searchResults(results, query as string);
  }

  private async deleteCard(): Promise<void> {
    const cards = this.cardManager.getAllCards();
    const cardId = await this.ui.deleteCard(cards);

    if (!cardId) {
      return;
    }

    const success = this.cardManager.deleteCard(cardId);
    if (success) {
      this.ui.showSuccess('Card deleted successfully!');
    } else {
      this.ui.showError('Failed to delete card!');
    }
  }

  private async showStatistics(): Promise<void> {
    const stats = this.cardManager.getExtendedStats();
    await this.ui.showEnhancedStats(stats);
  }

  // v1.2.0 Custom Study Mode
  private async customStudyMode(): Promise<void> {
    const allTags = this.cardManager.getAllTags();
    const filters = await this.ui.customStudySessionSetup(allTags);

    if (!filters) {
      return; // User cancelled
    }

    // Get filtered cards based on user selection
    let filteredCards: Flashcard[];

    if (filters.tags && filters.tags.length > 0) {
      filteredCards = this.cardManager.getFilteredCards(filters);
    } else if (filters.difficulty) {
      filteredCards = this.cardManager.getCardsByDifficulty(filters.difficulty);
    } else {
      filteredCards = this.cardManager.getAllCards();
    }

    // Apply additional filters
    if (filters.randomOrder) {
      filteredCards.sort(() => Math.random() - 0.5);
    }

    if (filters.limit && filters.limit > 0 && filters.limit < filteredCards.length) {
      filteredCards = filteredCards.slice(0, filters.limit);
    }

    if (filteredCards.length === 0) {
      this.ui.showError('No cards match your filters!');
      return;
    }

    await this.runStudySession(filteredCards, filteredCards.length, 'custom', filters);
  }

  // v1.2.0 Achievements display
  private async showAchievements(): Promise<void> {
    const stats = this.cardManager.getExtendedStats();
    await this.ui.showAchievements(stats.achievements);
  }

  // v1.2.0 Analytics dashboard
  private async showAnalytics(): Promise<void> {
    const stats = this.cardManager.getExtendedStats();
    await this.ui.showAnalytics(stats);
  }

  // Future backend integration methods
  private async syncWithBackend(): Promise<void> {
    // TODO: Implement backend synchronization
    console.log('Backend sync not yet implemented');
  }

  private async exportCards(): Promise<void> {
    // TODO: Implement card export functionality
    console.log('Export functionality not yet implemented');
  }

  private async importCards(): Promise<void> {
    // TODO: Implement card import functionality
    console.log('Import functionality not yet implemented');
  }
}

// Handle command line arguments
const args = process.argv.slice(2);

async function main() {
  const app = new TerminalAnki();

  if (args.includes('--study') || args.includes('-s')) {
    // Direct study mode
    await app.studyMode();
  } else if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Terminal Anki v1.2.0 - Enhanced Flashcard Learning System

Usage:
  anki                    Start interactive mode
  anki --study          Start directly in study mode
  anki --help           Show this help message

New Features v1.2.0:
  ◎ Custom study sessions (by tags, difficulty, limits)
  ◈ Tag system for flashcards
  ◈ Learning streaks tracking
  ◑ Achievement system
  ◰ Enhanced analytics dashboard
  ◴ Study session history

Core Features:
  ◎ Spaced repetition learning (SM-2 algorithm)
  ◉ Flashcard management with tags
  ◰ Learning statistics & analytics
  ◉ Card search and filtering
  ◈ Local data storage with full history
    `);
  } else {
    // Interactive mode
    await app.run();
  }
}

// Run the application
main().catch(console.error);

export { TerminalAnki };
