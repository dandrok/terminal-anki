/**
 * Study session-related types and interfaces
 */

export interface StudySessionRecord {
  id: string;
  startTime: Date;
  endTime?: Date;
  cardsStudied: number;
  correctAnswers: number;
  incorrectAnswers: number;
  averageDifficulty: number;
  sessionType: 'due' | 'custom' | 'all';
  customFilters?: {
    tags?: string[];
    difficulty?: 'new' | 'learning' | 'young' | 'mature';
  };
  quitEarly: boolean;
}

export interface CustomStudyFilters {
  tags?: string[];
  difficulty?: 'new' | 'learning' | 'young' | 'mature';
  limit?: number;
  randomOrder?: boolean;
}

export interface SessionConfig {
  type: 'due' | 'custom' | 'all';
  maxCards: number;
  filters?: CustomStudyFilters;
}

export interface SessionProgress {
  currentIndex: number;
  totalCards: number;
  studiedCount: number;
  correctCount: number;
  averageDifficulty: number;
  timeSpent: number;
}

export interface SessionSummary {
  totalCards: number;
  studiedCards: number;
  correctAnswers: number;
  accuracy: number;
  averageDifficulty: number;
  timeSpent: number;
  quitEarly: boolean;
}

// Session length presets
export type SessionLength = 'quick' | 'standard' | 'intensive' | 'custom';
export const SESSION_LENGTHS = {
  quick: 10,
  standard: 25,
  intensive: 50
} as const;

// Discriminated union for session events
export type SessionEvent =
  | { type: 'START'; config: SessionConfig }
  | { type: 'CARD_SHOWN'; cardId: string }
  | { type: 'CARD_ANSWERED'; cardId: string; quality: number }
  | { type: 'CARD_SKIPPED'; cardId: string }
  | { type: 'SESSION_COMPLETE'; summary: SessionSummary }
  | { type: 'SESSION_QUIT'; summary: SessionSummary };
