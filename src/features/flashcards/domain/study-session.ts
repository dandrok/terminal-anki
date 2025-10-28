import { Flashcard } from './flashcard';

export interface StudySession {
  cards: Flashcard[];
  currentIndex: number;
  startTime: Date;
  correctReviews: number;
  incorrectReviews: number;
}

// Enhanced session tracking for history
export interface StudySessionRecord {
  id: string;
  startTime: Date;
  endTime?: Date;
  cardsStudied: number;
  correctAnswers: number;
  incorrectAnswers: number;
  averageDifficulty: number;
  sessionType: 'due' | 'custom' | 'all' | 'new' | 'review';
  customFilters?: {
    tags?: string[];
    difficulty?: 'new' | 'learning' | 'young' | 'mature';
  };
  quitEarly: boolean;
  duration: number;
}
