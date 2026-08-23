/** A single flashcard together with its SM-2 scheduling state. */
export interface Flashcard {
  id: string;
  front: string;
  back: string;
  /** Topics/categories for the card. Always stored lower-cased. */
  tags: string[];
  easiness: number;
  interval: number;
  repetitions: number;
  nextReview: Date;
  lastReview: Date | null;
  createdAt: Date;
  /**
   * The source note's identity, when the card came from an import.
   *
   * Anki gives every note a stable GUID that survives editing and re-export, so
   * re-importing an updated deck can refresh the text of a card already being
   * studied instead of adding a second copy of it.
   */
  guid?: string;
  /**
   * Media files the front or back refers to.
   *
   * Derived from the text and stored alongside it so the files a card needs can
   * be found without re-parsing every card.
   */
  media?: string[];
}

/** SM-2 recall grade: 0 (total blackout) through 5 (perfect recall). */
export type ReviewQuality = 0 | 1 | 2 | 3 | 4 | 5;

/** How far along the scheduling curve a card is, derived from its interval. */
export type DifficultyLevel = 'new' | 'learning' | 'young' | 'mature';

export interface CardDistribution {
  new: number;
  learning: number;
  young: number;
  mature: number;
}

export interface CardStats {
  totalCards: number;
  dueCards: number;
  totalReviews: number;
  averageEasiness: number;
  distribution: CardDistribution;
}
