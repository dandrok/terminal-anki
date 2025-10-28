/**
 * Analytics and statistics types
 */

export interface WeeklyProgress {
  week: string;
  cardsStudied: number;
  accuracy: number;
  sessionCount: number;
}

export interface LearningStreak {
  currentStreak: number;
  longestStreak: number;
  lastStudyDate: Date | null;
  studyDates: string[];
}

export interface ExtendedStats {
  // Basic stats
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

  // Extended stats (v1.2.0+)
  learningStreak: LearningStreak;
  totalStudyTime: number; // in minutes
  sessionsCompleted: number;
  averageSessionLength: number; // in minutes
  achievements: import('./achievement.types.js').Achievement[];
  recentSessions: import('./session.types.js').StudySessionRecord[];
  tagDistribution: Record<string, number>;
  weeklyProgress: WeeklyProgress[];
}

export interface AnalyticsFilter {
  startDate?: Date;
  endDate?: Date;
  tags?: string[];
  sessionType?: import('./session.types.js').StudySessionRecord['sessionType'];
}

export interface PerformanceMetrics {
  averageAccuracy: number;
  averageSessionLength: number;
  averageDifficulty: number;
  cardsPerHour: number;
  retentionRate: number;
}

export interface LearningTrends {
  weeklyAccuracy: number[];
  weeklyCardsStudied: number[];
  weeklyStudyTime: number[];
  difficultyProgression: {
    new: number[];
    learning: number[];
    young: number[];
    mature: number[];
  };
}

export interface StudyPattern {
  bestStudyDay: string;
  averageSessionTime: string;
  preferredDifficulty: import('./flashcard.types.js').CardDifficulty;
  mostStudiedTag: string;
}

export interface AnalyticsReport {
  generatedAt: Date;
  dateRange: { start: Date; end: Date };
  summary: ExtendedStats;
  metrics: PerformanceMetrics;
  trends: LearningTrends;
  patterns: StudyPattern;
  recommendations: string[];
}
