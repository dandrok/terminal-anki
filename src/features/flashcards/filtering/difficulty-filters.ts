import { Flashcard, CardDifficulty } from '../domain';
import { getCardDifficulty } from '../sm2-algorithm/spaced-repetition';

/**
 * Pure functions for difficulty-based card filtering
 * Separated from other filtering concerns for better modularity
 */

/**
 * Check if a card matches a difficulty level
 */
export const matchesDifficulty = (card: Flashcard, difficulty: CardDifficulty): boolean => {
  return getCardDifficulty(card) === difficulty;
};

/**
 * Get cards by specific difficulty level
 */
export const getCardsByDifficulty = (
  cards: Flashcard[],
  difficulty: CardDifficulty
): Flashcard[] => {
  return cards.filter(card => matchesDifficulty(card, difficulty));
};

/**
 * Get cards by multiple difficulty levels
 */
export const getCardsByDifficulties = (
  cards: Flashcard[],
  difficulties: CardDifficulty[]
): Flashcard[] => {
  if (!difficulties || difficulties.length === 0) {
    return [...cards];
  }

  return cards.filter(card => difficulties.includes(getCardDifficulty(card)));
};

/**
 * Get difficulty distribution statistics
 */
export const getDifficultyDistribution = (cards: Flashcard[]): Record<CardDifficulty, number> => {
  const distribution: Record<CardDifficulty, number> = {
    new: 0,
    learning: 0,
    young: 0,
    mature: 0
  };

  cards.forEach(card => {
    const difficulty = getCardDifficulty(card);
    distribution[difficulty]++;
  });

  return distribution;
};

/**
 * Get cards with easiness factor in a specific range
 */
export const getCardsByEasinessRange = (
  cards: Flashcard[],
  minEasiness: number,
  maxEasiness: number
): Flashcard[] => {
  return cards.filter(card => card.easiness >= minEasiness && card.easiness <= maxEasiness);
};

/**
 * Get struggling cards (low easiness factor)
 */
export const getStrugglingCards = (cards: Flashcard[], threshold: number = 1.8): Flashcard[] => {
  return getCardsByEasinessRange(cards, 1.3, threshold);
};

/**
 * Get well-learned cards (high easiness factor)
 */
export const getWellLearnedCards = (cards: Flashcard[], threshold: number = 2.8): Flashcard[] => {
  return getCardsByEasinessRange(cards, threshold, 3.0);
};

/**
 * Get cards by repetition count ranges
 */
export const getCardsByRepetitionRange = (
  cards: Flashcard[],
  minRepetitions: number,
  maxRepetitions: number
): Flashcard[] => {
  return cards.filter(
    card => card.repetitions >= minRepetitions && card.repetitions <= maxRepetitions
  );
};

/**
 * Get new cards (0 repetitions)
 */
export const getNewCards = (cards: Flashcard[]): Flashcard[] => {
  return cards.filter(card => card.repetitions === 0);
};

/**
 * Get experienced cards (1+ repetitions)
 */
export const getExperiencedCards = (cards: Flashcard[]): Flashcard[] => {
  return cards.filter(card => card.repetitions > 0);
};

/**
 * Get cards by interval ranges
 */
export const getCardsByIntervalRange = (
  cards: Flashcard[],
  minInterval: number,
  maxInterval: number
): Flashcard[] => {
  return cards.filter(card => card.interval >= minInterval && card.interval <= maxInterval);
};

/**
 * Get cards with short intervals (frequently reviewed)
 */
export const getHighFrequencyCards = (cards: Flashcard[], maxInterval: number = 7): Flashcard[] => {
  return getCardsByIntervalRange(cards, 1, maxInterval);
};

/**
 * Get cards with long intervals (infrequently reviewed)
 */
export const getLowFrequencyCards = (cards: Flashcard[], minInterval: number = 30): Flashcard[] => {
  return cards.filter(card => card.interval >= minInterval);
};

/**
 * Calculate difficulty statistics
 */
export const calculateDifficultyStats = (cards: Flashcard[]) => {
  const distribution = getDifficultyDistribution(cards);
  const totalCards = cards.length;

  return {
    distribution,
    percentages: {
      new: (distribution.new / totalCards) * 100,
      learning: (distribution.learning / totalCards) * 100,
      young: (distribution.young / totalCards) * 100,
      mature: (distribution.mature / totalCards) * 100
    },
    averageEasiness: cards.reduce((sum, card) => sum + card.easiness, 0) / totalCards,
    averageRepetitions: cards.reduce((sum, card) => sum + card.repetitions, 0) / totalCards,
    averageInterval: cards.reduce((sum, card) => sum + card.interval, 0) / totalCards
  };
};

/**
 * Filter cards by multiple difficulty criteria
 */
export const filterByDifficultyCriteria = (
  cards: Flashcard[],
  criteria: {
    difficulties?: CardDifficulty[];
    minEasiness?: number;
    maxEasiness?: number;
    minRepetitions?: number;
    maxRepetitions?: number;
    minInterval?: number;
    maxInterval?: number;
  }
): Flashcard[] => {
  let filtered = [...cards];

  // Filter by difficulty levels
  if (criteria.difficulties && criteria.difficulties.length > 0) {
    filtered = getCardsByDifficulties(filtered, criteria.difficulties);
  }

  // Filter by easiness range
  if (criteria.minEasiness !== undefined || criteria.maxEasiness !== undefined) {
    const min = criteria.minEasiness ?? 1.3;
    const max = criteria.maxEasiness ?? 3.0;
    filtered = getCardsByEasinessRange(filtered, min, max);
  }

  // Filter by repetition range
  if (criteria.minRepetitions !== undefined || criteria.maxRepetitions !== undefined) {
    const min = criteria.minRepetitions ?? 0;
    const max = criteria.maxRepetitions ?? Infinity;
    filtered = getCardsByRepetitionRange(filtered, min, max);
  }

  // Filter by interval range
  if (criteria.minInterval !== undefined || criteria.maxInterval !== undefined) {
    const min = criteria.minInterval ?? 1;
    const max = criteria.maxInterval ?? Infinity;
    filtered = getCardsByIntervalRange(filtered, min, max);
  }

  return filtered;
};
