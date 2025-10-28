import { CardStats } from './card-stats';
import { LearningStreak } from './learning-streak';
import { Achievement } from './achievement';
import { StudySessionRecord } from './study-session';

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
