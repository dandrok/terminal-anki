import type { CardStats, Flashcard } from './card.js';
import type { StudySessionRecord } from './session.js';

/** Consecutive-day study tracking. Dates are local-calendar YYYY-MM-DD keys. */
export interface LearningStreak {
  currentStreak: number;
  longestStreak: number;
  lastStudyDate: Date | null;
  studyDates: string[];
}

export type AchievementCategory = 'cards' | 'sessions' | 'streaks' | 'mastery';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt?: Date;
  category: AchievementCategory;
  progress: {
    current: number;
    required: number;
    description: string;
  };
}

export interface WeeklyProgress {
  week: string;
  cardsStudied: number;
  accuracy: number;
  sessionCount: number;
}

/** Card stats enriched with streaks, achievements and session analytics. */
export interface ExtendedStats extends CardStats {
  learningStreak: LearningStreak;
  /** Total time spent studying, in minutes. */
  totalStudyTime: number;
  sessionsCompleted: number;
  averageSessionLength: number;
  achievements: Achievement[];
  recentSessions: StudySessionRecord[];
  tagDistribution: Record<string, number>;
  weeklyProgress: WeeklyProgress[];
}

/** Everything the application persists between runs. */
export interface PersistedData {
  version: number;
  cards: Flashcard[];
  sessionHistory: StudySessionRecord[];
  learningStreak: LearningStreak;
  achievements: Achievement[];
}
