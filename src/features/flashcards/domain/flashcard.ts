export interface Flashcard {
  id: string;
  front: string;
  back: string;
  tags: string[]; // Topics/categories for the card
  easiness: number;
  interval: number;
  repetitions: number;
  nextReview: Date;
  lastReview: Date | null;
  createdAt: Date;
}
