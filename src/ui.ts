import chalk from 'chalk';
import ora from 'ora';
import { intro, outro, select, text, confirm, multiselect, isCancel } from '@clack/prompts';
import { Flashcard, ReviewQuality } from './types';

export class UIManager {
  showIntro(): void {
    intro(chalk.cyan('🧠 Terminal Anki - Flashcard Learning System'));
  }

  showOutro(): void {
    outro(chalk.green('Happy learning! Goodbye! 👋'));
  }

  async showMainMenu(stats: any): Promise<string> {
    console.log(chalk.yellow(`\n📚 Total cards: ${stats.totalCards} | ⏰ Due today: ${stats.dueCards}`));

    const action = await select({
      message: 'What would you like to do?',
      options: [
        { value: 'study', label: '◆ Study due cards' },
        { value: 'add', label: '+ Add new card' },
        { value: 'list', label: '□ List all cards' },
        { value: 'search', label: '◉ Search cards' },
        { value: 'delete', label: '× Delete card' },
        { value: 'stats', label: '◈ Statistics' },
        { value: 'exit', label: '◐ Exit' }
      ]
    });

    if (isCancel(action)) {
      return 'exit';
    }

    return action as string;
  }

  async addCardForm(): Promise<{ front: string; back: string } | null> {
    console.log(chalk.blue('\n➕ Add New Flashcard'));
    console.log(chalk.gray('-'.repeat(30)));

    const front = await text({
      message: 'Front (Question):',
      placeholder: 'Enter the question...'
    });

    if (isCancel(front) || !front) {
      return null;
    }

    const back = await text({
      message: 'Back (Answer):',
      placeholder: 'Enter the answer...'
    });

    if (isCancel(back) || !back) {
      return null;
    }

    return { front: front as string, back: back as string };
  }

  async listCards(cards: Flashcard[]): Promise<void> {
    if (cards.length === 0) {
      console.log(chalk.yellow('📭 No flashcards found!'));
      return;
    }

    console.log(chalk.blue(`\n📋 All Flashcards (${cards.length} total)`));
    console.log(chalk.gray('-'.repeat(60)));

    cards.forEach((card, index) => {
      const isDue = card.nextReview <= new Date();
      const status = isDue ?
        chalk.red('⏰ Due') :
        chalk.green(`📅 In ${card.interval} days`);

      const frontText = card.front.length > 30 ? card.front.substring(0, 30) + '...' : card.front;
      const backText = card.back.length > 30 ? card.back.substring(0, 30) + '...' : card.back;

      console.log(`${index + 1}. [${status}] ${chalk.white(frontText)} → ${chalk.gray(backText)}`);
    });

    console.log('\n');
  }

  async browseCards(cards: Flashcard[]): Promise<void> {
    if (cards.length === 0) {
      console.log(chalk.yellow('📭 No flashcards found!'));
      return;
    }

    let currentIndex = 0;

    while (currentIndex < cards.length) {
      const card = cards[currentIndex];

      // Clear screen and show card header
      console.clear();
      console.log(chalk.blue(`\n🔍 Card Browser - ${currentIndex + 1}/${cards.length}`));
      console.log(chalk.gray('-'.repeat(60)));

      // Show front of card
      console.log(chalk.cyan('\n❓ Front:'));
      console.log(chalk.white(`  ${card.front}`));

      // Show status info
      const isDue = card.nextReview <= new Date();
      const status = isDue ?
        chalk.red('⏰ Due now') :
        chalk.green(`📅 Due in ${card.interval} days`);
      console.log(chalk.gray(`\nStatus: ${status} | Reviews: ${card.repetitions} | Easiness: ${card.easiness.toFixed(2)}`));

      // Navigation options
      const { select } = await import('@clack/prompts');
      const action = await select({
        message: '\nWhat would you like to do?',
        options: [
          { value: 'showAnswer', label: '◉ Show Answer' },
          { value: 'next', label: '▶ Next Card' },
          { value: 'previous', label: '◀ Previous Card' },
          { value: 'back', label: '◀ Back to Main Menu' }
        ]
      });

      if (action === 'back' || isCancel(action)) {
        break;
      }

      if (action === 'showAnswer') {
        // Show answer with same card header
        console.clear();
        console.log(chalk.blue(`\n🔍 Card Browser - ${currentIndex + 1}/${cards.length}`));
        console.log(chalk.gray('-'.repeat(60)));

        console.log(chalk.cyan('\n❓ Front:'));
        console.log(chalk.white(`  ${card.front}`));

        console.log(chalk.green('\n✅ Answer:'));
        console.log(chalk.white(`  ${card.back}`));

        console.log(chalk.gray(`\nStatus: ${status} | Reviews: ${card.repetitions} | Easiness: ${card.easiness.toFixed(2)}`));

        const continueAction = await select({
          message: '\nContinue?',
          options: [
            { value: 'next', label: '▶ Next Card' },
            { value: 'previous', label: '◀ Previous Card' },
            { value: 'back', label: '◀ Back to Main Menu' }
          ]
        });

        if (continueAction === 'back' || isCancel(continueAction)) {
          break;
        } else if (continueAction === 'next') {
          currentIndex++;
        } else if (continueAction === 'previous') {
          currentIndex = Math.max(0, currentIndex - 1);
        }
      } else if (action === 'next') {
        currentIndex++;
      } else if (action === 'previous') {
        currentIndex = Math.max(0, currentIndex - 1);
      }
    }
  }

  async searchResults(cards: Flashcard[], query: string): Promise<void> {
    if (cards.length === 0) {
      console.log(chalk.yellow(`📭 No cards found for "${query}"`));
      return;
    }

    console.log(chalk.blue(`\n📋 Found ${cards.length} matching cards:`));
    console.log(chalk.gray('-'.repeat(60)));

    cards.forEach((card, index) => {
      const isDue = card.nextReview <= new Date();
      const status = isDue ?
        chalk.red('⏰ Due') :
        chalk.green(`📅 In ${card.interval} days`);

      console.log(`${index + 1}. ${chalk.white(card.front)} → ${chalk.gray(card.back)}`);
      console.log(`   Status: ${status}`);
    });
  }

  async deleteCard(cards: Flashcard[]): Promise<string | null> {
    if (cards.length === 0) {
      console.log(chalk.yellow('📭 No flashcards to delete!'));
      return null;
    }

    const options = cards.map((card, index) => ({
      value: card.id,
      label: `${index + 1}. ${card.front} → ${card.back}`
    }));

    options.unshift({ value: 'cancel', label: '❌ Cancel' });

    const selectedId = await select({
      message: 'Select a card to delete:',
      options
    });

    if (isCancel(selectedId) || selectedId === 'cancel') {
      return null;
    }

    return selectedId as string;
  }

  async showStats(stats: any): Promise<void> {
    console.log(chalk.blue('\n📊 Learning Statistics'));
    console.log(chalk.gray('-'.repeat(40)));
    console.log(`📚 Total cards: ${stats.totalCards}`);
    console.log(`⏰ Due today: ${stats.dueCards}`);
    console.log(`🔄 Total reviews: ${stats.totalReviews}`);
    console.log(`📈 Average easiness: ${stats.averageEasiness.toFixed(2)}`);

    console.log(chalk.blue('\n📊 Card Distribution:'));
    console.log(`  ${chalk.yellow('New (1 day)')}: ${stats.distribution.new} cards`);
    console.log(`  ${chalk.blue('Learning (2-7 days)')}: ${stats.distribution.learning} cards`);
    console.log(`  ${chalk.green('Young (1-4 weeks)')}: ${stats.distribution.young} cards`);
    console.log(`  ${chalk.magenta('Mature (1+ month)')}: ${stats.distribution.mature} cards`);

    console.log('\n');

    // Back to main menu button
    const { select } = await import('@clack/prompts');
    await select({
      message: '',
      options: [
        { value: 'back', label: '◀ Back to main menu' }
      ]
    });
  }

  showSuccess(message: string): void {
    console.log(chalk.green(`✅ ${message}`));
  }

  showError(message: string): void {
    console.log(chalk.red(`❌ ${message}`));
  }

  showSpinner(message: string): any {
    return ora(message).start();
  }

  async pause(): Promise<void> {
    const shouldContinue = await confirm({
      message: 'Press Enter to continue...'
    });
  }
}