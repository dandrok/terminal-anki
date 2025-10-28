import { Achievement } from '../types/achievement.types.js';

/**
 * Achievement system constants and definitions
 */
export const ACHIEVEMENT_CATEGORIES = ['cards', 'sessions', 'streaks', 'mastery'] as const;

export const DEFAULT_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_card',
    name: 'First Steps',
    description: 'Create your first flashcard',
    icon: '◎',
    category: 'cards',
    progress: { current: 0, required: 1, description: 'cards created' }
  },
  {
    id: 'first_session',
    name: 'Study Beginner',
    description: 'Complete your first study session',
    icon: '◉',
    category: 'sessions',
    progress: { current: 0, required: 1, description: 'sessions completed' }
  },
  {
    id: 'streak_3',
    name: '3-Day Streak',
    description: 'Study for 3 consecutive days',
    icon: '◈',
    category: 'streaks',
    progress: { current: 0, required: 3, description: 'day streak' }
  },
  {
    id: 'streak_7',
    name: 'Week Warrior',
    description: 'Study for 7 consecutive days',
    icon: '◊',
    category: 'streaks',
    progress: { current: 0, required: 7, description: 'day streak' }
  },
  {
    id: 'cards_10',
    name: 'Growing Collection',
    description: 'Create 10 flashcards',
    icon: '◐',
    category: 'cards',
    progress: { current: 0, required: 10, description: 'cards created' }
  },
  {
    id: 'reviews_100',
    name: 'Dedicated Learner',
    description: 'Complete 100 card reviews',
    icon: '◰',
    category: 'mastery',
    progress: { current: 0, required: 100, description: 'total reviews' }
  },
  {
    id: 'sessions_10',
    name: 'Study Regular',
    description: 'Complete 10 study sessions',
    icon: '★',
    category: 'sessions',
    progress: { current: 0, required: 10, description: 'sessions completed' }
  },
  {
    id: 'accuracy_90',
    name: 'Accuracy Master',
    description: 'Achieve 90% accuracy in a session',
    icon: '◎',
    category: 'mastery',
    progress: { current: 0, required: 90, description: 'session accuracy %' }
  }
];

export const ACHIEVEMENT_ICONS = {
  cards: '◉',
  sessions: '◐',
  streaks: '◈',
  mastery: '◎'
} as const;

export const SESSION_HISTORY_LIMIT = 100;
export const MIN_SESSION_CARDS = 1;
export const MAX_SESSION_CARDS = 100;
