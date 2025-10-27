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

// Enhanced session tracking for history
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

// Learning streak tracking
export interface LearningStreak {
  currentStreak: number;
  longestStreak: number;
  lastStudyDate: Date | null;
  studyDates: string[]; // YYYY-MM-DD format
}

// Achievement system
export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt?: Date;
  category: 'cards' | 'sessions' | 'streaks' | 'mastery';
  progress: {
    current: number;
    required: number;
    description: string;
  };
}

// Enhanced statistics with analytics
export interface ExtendedStats extends CardStats {
  learningStreak: LearningStreak;
  totalStudyTime: number; // minutes
  sessionsCompleted: number;
  averageSessionLength: number;
  achievements: Achievement[];
  recentSessions: StudySessionRecord[];
  tagDistribution: Record<string, number>;
  weeklyProgress: {
    week: string;
    cardsStudied: number;
    accuracy: number;
    sessionCount: number;
  }[];
}

// Custom study session filters
export interface CustomStudyFilters {
  tags?: string[];
  difficulty?: 'new' | 'learning' | 'young' | 'mature';
  limit?: number;
  randomOrder?: boolean;
}
