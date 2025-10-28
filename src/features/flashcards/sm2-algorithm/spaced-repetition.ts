import { Flashcard, ReviewQuality } from '../domain';
import { Result, Ok } from '../../../shared/utils/result-type';
import { SM2_DEFAULTS } from '../../../shared/constants/session-limits';
import { addDays, addMinutes } from '../../../shared/utils/date-utils';

/**
 * SM-2 Spaced Repetition Algorithm implementation
 * Pure functions for calculating card scheduling
 */

export interface SM2CalculationResult {
  easiness: number;
  interval: number;
  repetitions: number;
  nextReview: Date;
}

/**
 * Calculate the next review parameters for a flashcard using SM-2 algorithm
 */
export const calculateNextReview = (
  card: Flashcard,
  quality: ReviewQuality
): Result<SM2CalculationResult> => {
  const now = new Date();
  let newEasiness = card.easiness;
  let newInterval = card.interval;
  let newRepetitions = card.repetitions + 1;

  // Update easiness factor based on quality
  newEasiness = Math.max(
    SM2_DEFAULTS.MINIMUM_EASINESS,
    newEasiness + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  );

  // Calculate interval based on quality and repetitions
  if (quality >= 3) {
    // Successful recall
    if (newRepetitions === 1) {
      newInterval = SM2_DEFAULTS.INITIAL_INTERVAL;
    } else if (newRepetitions === 2) {
      newInterval = SM2_DEFAULTS.INITIAL_INTERVAL_REPETITION_2;
    } else {
      newInterval = Math.ceil(newInterval * newEasiness);
    }
  } else {
    // Failed recall - reset to failed state
    newRepetitions = 0;
    newInterval = SM2_DEFAULTS.FAILED_INTERVAL;
  }

  // Calculate next review date
  const nextReview =
    quality >= 3
      ? addDays(now, newInterval)
      : addMinutes(now, SM2_DEFAULTS.FAILED_REVIEW_DELAY_MINUTES);

  return Ok({
    easiness: newEasiness,
    interval: newInterval,
    repetitions: newRepetitions,
    nextReview
  });
};

/**
 * Update a flashcard with new SM-2 parameters
 */
export const updateFlashcardProgress = (
  card: Flashcard,
  quality: ReviewQuality
): Result<Flashcard> => {
  const calculationResult = calculateNextReview(card, quality);

  if (!calculationResult.success) {
    return calculationResult;
  }

  const { easiness, interval, repetitions, nextReview } = calculationResult.data;
  const now = new Date();

  return Ok({
    ...card,
    easiness,
    interval,
    repetitions,
    nextReview,
    lastReview: now
  });
};

/**
 * Check if a card is due for review
 */
export const isCardDue = (card: Flashcard, referenceDate: Date = new Date()): boolean => {
  return card.nextReview <= referenceDate;
};

/**
 * Calculate the number of days until a card is due
 */
export const getDaysUntilDue = (card: Flashcard, referenceDate: Date = new Date()): number => {
  const diffTime = card.nextReview.getTime() - referenceDate.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Get the difficulty category of a card based on its interval
 */
export const getCardDifficulty = (card: Flashcard): 'new' | 'learning' | 'young' | 'mature' => {
  if (card.interval <= 1) return 'new';
  if (card.interval <= 7) return 'learning';
  if (card.interval <= 30) return 'young';
  return 'mature';
};

/**
 * Calculate the predicted next interval for a given quality
 */
export const predictNextInterval = (
  currentInterval: number,
  currentEasiness: number,
  currentRepetitions: number,
  quality: ReviewQuality
): number => {
  let newRepetitions = currentRepetitions + 1;
  let newInterval = currentInterval;

  if (quality >= 3) {
    if (newRepetitions === 1) {
      newInterval = SM2_DEFAULTS.INITIAL_INTERVAL;
    } else if (newRepetitions === 2) {
      newInterval = SM2_DEFAULTS.INITIAL_INTERVAL_REPETITION_2;
    } else {
      newInterval = Math.ceil(newInterval * currentEasiness);
    }
  } else {
    newRepetitions = 0;
    newInterval = SM2_DEFAULTS.FAILED_INTERVAL;
  }

  return newInterval;
};

/**
 * Get recommended study session size based on due cards count
 */
export const getRecommendedSessionSize = (dueCardsCount: number): number => {
  if (dueCardsCount <= 10) return dueCardsCount;
  if (dueCardsCount <= 25) return 25;
  if (dueCardsCount <= 50) return 50;
  return Math.min(100, Math.ceil(dueCardsCount * 0.3));
};

/**
 * Calculate card priority for study sessions
 */
export const calculateCardPriority = (card: Flashcard): number => {
  const daysOverdue = getDaysUntilDue(card);
  const difficulty = getCardDifficulty(card);

  // Priority based on how overdue and difficulty
  let priority = 0;

  if (daysOverdue < 0) {
    // Overdue cards get higher priority
    priority += Math.abs(daysOverdue) * 10;
  } else if (daysOverdue === 0) {
    // Due today
    priority += 5;
  }

  // New cards get higher priority
  if (difficulty === 'new') priority += 3;
  // Learning cards get moderate priority
  if (difficulty === 'learning') priority += 2;

  return priority;
};

/**
 * Sort cards by study priority
 */
export const sortCardsByPriority = (cards: Flashcard[]): Flashcard[] => {
  return [...cards].sort((a, b) => {
    const priorityA = calculateCardPriority(a);
    const priorityB = calculateCardPriority(b);
    return priorityB - priorityA; // Higher priority first
  });
};
