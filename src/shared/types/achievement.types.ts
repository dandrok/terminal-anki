/**
 * Achievement system types and interfaces
 */

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  progress: AchievementProgress;
  unlockedAt?: Date;
}

export type AchievementCategory = 'cards' | 'sessions' | 'streaks' | 'mastery';

export interface AchievementProgress {
  current: number;
  required: number;
  description: string;
}

export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  requirement: AchievementRequirement;
}

export type AchievementRequirement = {
  type:
    | 'cards_created'
    | 'sessions_completed'
    | 'streak_days'
    | 'total_reviews'
    | 'session_accuracy';
  value: number;
  description: string;
};

export interface AchievementEvent {
  type: 'CARD_CREATED' | 'SESSION_COMPLETED' | 'STREAK_UPDATED' | 'REVIEW_COMPLETED';
  data: {
    cardId?: string;
    sessionId?: string;
    streakDays?: number;
    accuracy?: number;
    totalReviews?: number;
    sessionsCompleted?: number;
    cardsCreated?: number;
  };
}

export interface AchievementTracker {
  totalCardsCreated: number;
  totalSessionsCompleted: number;
  currentStreak: number;
  longestStreak: number;
  totalReviews: number;
  lastStudyDate?: Date;
  studyDates: string[];
  achievements: Achievement[];
}

// Achievement templates
export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  {
    id: 'first_card',
    name: 'First Steps',
    description: 'Create your first flashcard',
    icon: '◎',
    category: 'cards',
    requirement: {
      type: 'cards_created',
      value: 1,
      description: 'cards created'
    }
  },
  {
    id: 'first_session',
    name: 'Study Beginner',
    description: 'Complete your first study session',
    icon: '◉',
    category: 'sessions',
    requirement: {
      type: 'sessions_completed',
      value: 1,
      description: 'sessions completed'
    }
  },
  {
    id: 'streak_3',
    name: '3-Day Streak',
    description: 'Study for 3 consecutive days',
    icon: '◈',
    category: 'streaks',
    requirement: {
      type: 'streak_days',
      value: 3,
      description: 'day streak'
    }
  },
  {
    id: 'streak_7',
    name: 'Week Warrior',
    description: 'Study for 7 consecutive days',
    icon: '◊',
    category: 'streaks',
    requirement: {
      type: 'streak_days',
      value: 7,
      description: 'day streak'
    }
  },
  {
    id: 'cards_10',
    name: 'Growing Collection',
    description: 'Create 10 flashcards',
    icon: '◐',
    category: 'cards',
    requirement: {
      type: 'cards_created',
      value: 10,
      description: 'cards created'
    }
  },
  {
    id: 'reviews_100',
    name: 'Dedicated Learner',
    description: 'Complete 100 card reviews',
    icon: '◰',
    category: 'mastery',
    requirement: {
      type: 'total_reviews',
      value: 100,
      description: 'total reviews'
    }
  },
  {
    id: 'sessions_10',
    name: 'Study Regular',
    description: 'Complete 10 study sessions',
    icon: '★',
    category: 'sessions',
    requirement: {
      type: 'sessions_completed',
      value: 10,
      description: 'sessions completed'
    }
  },
  {
    id: 'accuracy_90',
    name: 'Accuracy Master',
    description: 'Achieve 90% accuracy in a session',
    icon: '◎',
    category: 'mastery',
    requirement: {
      type: 'session_accuracy',
      value: 90,
      description: 'session accuracy %'
    }
  }
];

// Achievement lookup utility
export const getAchievementDefinition = (id: string): AchievementDefinition | undefined => {
  return ACHIEVEMENT_DEFINITIONS.find(def => def.id === id);
};

// Achievement category utilities
export const getAchievementsByCategory = (
  category: AchievementCategory
): AchievementDefinition[] => {
  return ACHIEVEMENT_DEFINITIONS.filter(def => def.category === category);
};

export const categoryIcons = {
  cards: '◉',
  sessions: '◐',
  streaks: '◈',
  mastery: '◎'
} as const;
