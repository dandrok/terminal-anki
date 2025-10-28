import {
  ISpacedRepetitionService,
  IFlashcardService
} from '../../../shared/interfaces/services.js';
import { Flashcard, ReviewQuality } from '../domain';

/**
 * Spaced Repetition Service Implementation with Dependency Injection
 * Implements the SM-2 algorithm
 */
export class SpacedRepetitionService implements ISpacedRepetitionService {
  readonly name = 'SpacedRepetitionService';
  readonly version = '1.0.0';

  constructor(private flashcardService?: IFlashcardService) {}

  /**
   * Calculate next review parameters based on SM-2 algorithm
   */
  calculateNextReview(
    card: Flashcard,
    quality: ReviewQuality
  ): {
    easiness: number;
    interval: number;
    repetitions: number;
    nextReview: Date;
  } {
    let { easiness, interval, repetitions } = card;
    const now = new Date();

    // SM-2 Algorithm implementation
    if (quality >= 3) {
      // Correct response
      if (repetitions === 0) {
        interval = 1;
      } else if (repetitions === 1) {
        interval = 6;
      } else {
        interval = Math.round(interval * easiness);
      }
      repetitions++;
    } else {
      // Incorrect response - reset repetitions
      repetitions = 0;
      interval = 1;
    }

    // Update easiness factor
    easiness = easiness + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    easiness = Math.max(1.3, easiness); // Minimum easiness factor

    // Calculate next review date
    const nextReview = new Date(now.getTime() + interval * 24 * 60 * 60 * 1000);

    return {
      easiness: Math.round(easiness * 100) / 100,
      interval,
      repetitions,
      nextReview
    };
  }

  /**
   * Determine card difficulty based on repetition count
   */
  getCardDifficulty(card: Flashcard): 'new' | 'learning' | 'young' | 'mature' {
    if (card.repetitions === 0) {
      return 'new';
    } else if (card.repetitions === 1) {
      return 'learning';
    } else if (card.repetitions <= 5) {
      return 'young';
    } else {
      return 'mature';
    }
  }

  /**
   * Check if a card is due for review
   */
  isCardDue(card: Flashcard, referenceDate: Date = new Date()): boolean {
    return card.nextReview <= referenceDate;
  }

  /**
   * Get cards that are due within a specific number of days
   */
  getCardsDueInDays(cards: Flashcard[], days: number): Flashcard[] {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() + days);
    cutoffDate.setHours(23, 59, 59, 999);

    return cards.filter(card => card.nextReview <= cutoffDate);
  }

  /**
   * Get cards that are overdue
   */
  getOverdueCards(cards: Flashcard[]): Flashcard[] {
    const now = new Date();
    return cards.filter(card => card.nextReview < now);
  }

  /**
   * Calculate retention rate for a set of cards
   */
  calculateRetentionRate(cards: Flashcard[]): number {
    if (cards.length === 0) {
      return 0;
    }

    const retainedCards = cards.filter(card => {
      const difficulty = this.getCardDifficulty(card);
      return difficulty === 'young' || difficulty === 'mature';
    });

    return Math.round((retainedCards.length / cards.length) * 100);
  }

  /**
   * Get optimal study load for next N days
   */
  getOptimalStudyLoad(
    cards: Flashcard[],
    days: number
  ): Array<{
    date: string;
    dueCount: number;
    isNew: boolean;
  }> {
    const schedule: Array<{ date: string; dueCount: number; isNew: boolean }> = [];
    const today = new Date();

    for (let i = 0; i < days; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() + i);
      checkDate.setHours(0, 0, 0, 0);

      const dueCards = cards.filter(card => {
        const cardDate = new Date(card.nextReview);
        cardDate.setHours(0, 0, 0, 0);
        return cardDate.getTime() === checkDate.getTime();
      });

      schedule.push({
        date: checkDate.toISOString().split('T')[0],
        dueCount: dueCards.length,
        isNew: i === 0
      });
    }

    return schedule;
  }

  /**
   * Suggest study session limits based on due cards
   */
  suggestStudyLimits(cards: Flashcard[]): {
    quick: number;
    standard: number;
    intensive: number;
    custom: number;
  } {
    const dueCards = cards.filter(card => this.isCardDue(card));
    const totalDue = dueCards.length;

    // Suggest limits based on due card count
    const quick = Math.min(10, Math.max(5, Math.floor(totalDue * 0.2)));
    const standard = Math.min(25, Math.max(10, Math.floor(totalDue * 0.4)));
    const intensive = Math.min(50, Math.max(20, Math.floor(totalDue * 0.7)));
    const custom = totalDue;

    return {
      quick: Math.max(1, quick),
      standard: Math.max(1, standard),
      intensive: Math.max(1, intensive),
      custom: Math.max(1, custom)
    };
  }
}
