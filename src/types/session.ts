import type { DifficultyLevel, Flashcard } from './card.js';

export type SessionType = 'due' | 'custom' | 'all';

/** In-flight state of a study session. */
export interface StudySession {
  cards: Flashcard[];
  currentIndex: number;
  startTime: Date;
  correctReviews: number;
  incorrectReviews: number;
}

/** A completed session, persisted to history. */
export interface StudySessionRecord {
  id: string;
  startTime: Date;
  endTime?: Date;
  cardsStudied: number;
  correctAnswers: number;
  incorrectAnswers: number;
  averageDifficulty: number;
  sessionType: SessionType;
  customFilters?: {
    tags?: string[];
    difficulty?: DifficultyLevel;
  };
  quitEarly: boolean;
}

/** Selection criteria for a custom study session. */
export interface CustomStudyFilters {
  tags?: string[];
  difficulty?: DifficultyLevel;
  limit?: number;
  randomOrder?: boolean;
  /** Restrict to cards whose nextReview has already passed. */
  dueOnly?: boolean;
}
