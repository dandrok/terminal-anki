import { Flashcard } from '../domain';
import { isCardDue } from '../sm2-algorithm/spaced-repetition';

/**
 * Pure functions for date-based card filtering
 * Separated from other filtering concerns for better modularity
 */

/**
 * Check if a card is due for review
 */
export const matchesDueStatus = (card: Flashcard, includeDue: boolean = true): boolean => {
  if (!includeDue) return true;
  return isCardDue(card);
};

/**
 * Get cards that are due for review
 */
export const getDueCards = (cards: Flashcard[], referenceDate?: Date): Flashcard[] => {
  return cards.filter(card => isCardDue(card, referenceDate));
};

/**
 * Get cards that are not due for review
 */
export const getNotDueCards = (cards: Flashcard[], referenceDate?: Date): Flashcard[] => {
  return cards.filter(card => !isCardDue(card, referenceDate));
};

/**
 * Get overdue cards (due before now)
 */
export const getOverdueCards = (cards: Flashcard[], referenceDate?: Date): Flashcard[] => {
  const now = referenceDate || new Date();
  return cards.filter(card => card.nextReview < now);
};

/**
 * Get cards coming up soon (within specified days)
 */
export const getUpcomingCards = (
  cards: Flashcard[],
  daysAhead: number = 3,
  fromDate?: Date
): Flashcard[] => {
  const now = fromDate || new Date();
  const futureDate = new Date(now);
  futureDate.setDate(futureDate.getDate() + daysAhead);

  return cards.filter(card => {
    return card.nextReview >= now && card.nextReview <= futureDate;
  });
};

/**
 * Get cards that haven't been studied recently
 */
export const getStaleCards = (
  cards: Flashcard[],
  daysThreshold: number = 7,
  fromDate?: Date
): Flashcard[] => {
  const threshold = fromDate || new Date();
  threshold.setDate(threshold.getDate() - daysThreshold);

  return cards.filter(card => {
    const lastActivity = card.lastReview || card.createdAt;
    return lastActivity < threshold;
  });
};

/**
 * Get recently studied cards (within specified hours)
 */
export const getRecentlyStudiedCards = (
  cards: Flashcard[],
  hoursBack: number = 24,
  fromDate?: Date
): Flashcard[] => {
  const threshold = fromDate || new Date();
  threshold.setHours(threshold.getHours() - hoursBack);

  return cards.filter(card => {
    return card.lastReview && card.lastReview >= threshold;
  });
};

/**
 * Get cards created within a date range
 */
export const getCardsByCreationDateRange = (
  cards: Flashcard[],
  startDate?: Date,
  endDate?: Date
): Flashcard[] => {
  return cards.filter(card => {
    if (startDate && card.createdAt < startDate) {
      return false;
    }
    if (endDate && card.createdAt > endDate) {
      return false;
    }
    return true;
  });
};

/**
 * Get cards created before a specific date
 */
export const getCardsCreatedBefore = (cards: Flashcard[], date: Date): Flashcard[] => {
  return cards.filter(card => card.createdAt < date);
};

/**
 * Get cards created after a specific date
 */
export const getCardsCreatedAfter = (cards: Flashcard[], date: Date): Flashcard[] => {
  return cards.filter(card => card.createdAt > date);
};

/**
 * Get cards by last review date range
 */
export const getCardsByLastReviewRange = (
  cards: Flashcard[],
  startDate?: Date,
  endDate?: Date
): Flashcard[] => {
  return cards.filter(card => {
    if (!card.lastReview) return false;

    if (startDate && card.lastReview < startDate) {
      return false;
    }
    if (endDate && card.lastReview > endDate) {
      return false;
    }
    return true;
  });
};

/**
 * Get cards never reviewed
 */
export const getNeverReviewedCards = (cards: Flashcard[]): Flashcard[] => {
  return cards.filter(card => !card.lastReview);
};

/**
 * Get cards reviewed within the last N days
 */
export const getCardsRecentlyReviewed = (cards: Flashcard[], daysBack: number = 7): Flashcard[] => {
  const threshold = new Date();
  threshold.setDate(threshold.getDate() - daysBack);

  return cards.filter(card => card.lastReview && card.lastReview >= threshold);
};

/**
 * Get cards reviewed exactly N days ago
 */
export const getCardsReviewedExactlyDaysAgo = (
  cards: Flashcard[],
  daysAgo: number
): Flashcard[] => {
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() - daysAgo);

  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  return cards.filter(
    card => card.lastReview && card.lastReview >= startOfDay && card.lastReview <= endOfDay
  );
};

/**
 * Calculate due date statistics
 */
export const calculateDueDateStats = (cards: Flashcard[], referenceDate?: Date) => {
  const now = referenceDate || new Date();
  const due = getDueCards(cards, now);
  const overdue = getOverdueCards(cards, now);
  const upcoming = getUpcomingCards(cards, 3, now);
  const stale = getStaleCards(cards, 7, now);

  return {
    totalCards: cards.length,
    dueCount: due.length,
    overdueCount: overdue.length,
    upcomingCount: upcoming.length,
    staleCount: stale.length,
    duePercentage: (due.length / cards.length) * 100,
    overduePercentage: (overdue.length / cards.length) * 100,
    upcomingPercentage: (upcoming.length / cards.length) * 100,
    stalePercentage: (stale.length / cards.length) * 100
  };
};

/**
 * Filter cards by multiple date criteria
 */
export const filterByDateCriteria = (
  cards: Flashcard[],
  criteria: {
    includeDue?: boolean;
    dueAfter?: Date;
    dueBefore?: Date;
    createdAfter?: Date;
    createdBefore?: Date;
    lastReviewAfter?: Date;
    lastReviewBefore?: Date;
    minDaysSinceLastReview?: number;
    maxDaysSinceLastReview?: number;
  },
  referenceDate?: Date
): Flashcard[] => {
  const now = referenceDate || new Date();
  let filtered = [...cards];

  // Filter by due status
  if (criteria.includeDue !== undefined) {
    filtered = filtered.filter(card => matchesDueStatus(card, criteria.includeDue));
  }

  // Filter by due date range
  if (criteria.dueAfter || criteria.dueBefore) {
    filtered = filtered.filter(card => {
      if (criteria.dueAfter && card.nextReview < criteria.dueAfter) {
        return false;
      }
      if (criteria.dueBefore && card.nextReview > criteria.dueBefore) {
        return false;
      }
      return true;
    });
  }

  // Filter by creation date range
  if (criteria.createdAfter || criteria.createdBefore) {
    filtered = filtered.filter(card => {
      if (criteria.createdAfter && card.createdAt < criteria.createdAfter) {
        return false;
      }
      if (criteria.createdBefore && card.createdAt > criteria.createdBefore) {
        return false;
      }
      return true;
    });
  }

  // Filter by last review date range
  if (criteria.lastReviewAfter || criteria.lastReviewBefore) {
    filtered = filtered.filter(card => {
      if (!card.lastReview) return false;
      if (criteria.lastReviewAfter && card.lastReview < criteria.lastReviewAfter) {
        return false;
      }
      if (criteria.lastReviewBefore && card.lastReview > criteria.lastReviewBefore) {
        return false;
      }
      return true;
    });
  }

  // Filter by days since last review
  if (
    criteria.minDaysSinceLastReview !== undefined ||
    criteria.maxDaysSinceLastReview !== undefined
  ) {
    filtered = filtered.filter(card => {
      if (!card.lastReview) return false;

      const daysSinceLastReview = Math.floor(
        (now.getTime() - card.lastReview.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (
        criteria.minDaysSinceLastReview !== undefined &&
        daysSinceLastReview < criteria.minDaysSinceLastReview
      ) {
        return false;
      }
      if (
        criteria.maxDaysSinceLastReview !== undefined &&
        daysSinceLastReview > criteria.maxDaysSinceLastReview
      ) {
        return false;
      }
      return true;
    });
  }

  return filtered;
};
