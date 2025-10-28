import { Flashcard, ReviewQuality } from '../domain';

export const updateSpacedRepetition = (card: Flashcard, quality: ReviewQuality): Flashcard => {
  const now = new Date();
  card.lastReview = now;
  card.repetitions += 1;

  // SM-2 Algorithm implementation
  if (quality >= 3) {
    if (card.repetitions === 1) {
      card.interval = 1;
    } else if (card.repetitions === 2) {
      card.interval = 6;
    } else {
      card.interval = Math.ceil(card.interval * card.easiness);
    }

    card.nextReview = new Date(now.getTime() + card.interval * 24 * 60 * 60 * 1000);
  } else {
    card.repetitions = 0;
    card.interval = 1;
    card.nextReview = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes
  }

  // Update easiness factor
  card.easiness = Math.max(
    1.3,
    card.easiness + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  );

  return card;
};
