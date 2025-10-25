export interface Flashcard {
  id: string;
  front: string;
  back: string;
  easiness: number;
  interval: number;
  repetitions: number;
  nextReview: Date;
  lastReview: Date | null;
  createdAt: Date;
}

export type ReviewQuality = 0 | 1 | 2 | 3 | 4 | 5;

export interface CardStats {
  totalCards: number;
  dueCards: number;
  totalReviews: number;
  averageEasiness: number;
  distribution: {
    new: number;
    learning: number;
    young: number;
    mature: number;
  };
}

export interface StudySession {
  cards: Flashcard[];
  currentIndex: number;
  startTime: Date;
  correctReviews: number;
  incorrectReviews: number;
}