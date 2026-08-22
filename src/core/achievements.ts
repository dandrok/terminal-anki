import type { Achievement } from '../types/index.js';

/** A snapshot of everything the achievement rules can look at. */
export interface AchievementContext {
  totalCards: number;
  totalReviews: number;
  sessionsCompleted: number;
  currentStreak: number;
  /** Accuracy of the session that just finished, 0-100, if there was one. */
  lastSessionAccuracy: number | null;
}

interface AchievementDefinition extends Omit<Achievement, 'progress' | 'unlockedAt'> {
  required: number;
  progressDescription: string;
  /** Current progress toward `required`, given a snapshot. */
  measure: (context: AchievementContext) => number;
}

const DEFINITIONS: AchievementDefinition[] = [
  {
    id: 'first_card',
    name: 'First Steps',
    description: 'Create your first flashcard',
    icon: '◎',
    category: 'cards',
    required: 1,
    progressDescription: 'cards created',
    measure: c => c.totalCards
  },
  {
    id: 'first_session',
    name: 'Study Beginner',
    description: 'Complete your first study session',
    icon: '◉',
    category: 'sessions',
    required: 1,
    progressDescription: 'sessions completed',
    measure: c => c.sessionsCompleted
  },
  {
    id: 'streak_3',
    name: '3-Day Streak',
    description: 'Study for 3 consecutive days',
    icon: '◈',
    category: 'streaks',
    required: 3,
    progressDescription: 'day streak',
    measure: c => c.currentStreak
  },
  {
    id: 'streak_7',
    name: 'Week Warrior',
    description: 'Study for 7 consecutive days',
    icon: '◊',
    category: 'streaks',
    required: 7,
    progressDescription: 'day streak',
    measure: c => c.currentStreak
  },
  {
    id: 'cards_10',
    name: 'Growing Collection',
    description: 'Create 10 flashcards',
    icon: '◐',
    category: 'cards',
    required: 10,
    progressDescription: 'cards created',
    measure: c => c.totalCards
  },
  {
    id: 'reviews_100',
    name: 'Dedicated Learner',
    description: 'Complete 100 card reviews',
    icon: '◰',
    category: 'mastery',
    required: 100,
    progressDescription: 'total reviews',
    measure: c => c.totalReviews
  },
  {
    id: 'sessions_10',
    name: 'Study Regular',
    description: 'Complete 10 study sessions',
    icon: '★',
    category: 'sessions',
    required: 10,
    progressDescription: 'sessions completed',
    measure: c => c.sessionsCompleted
  },
  {
    id: 'accuracy_90',
    name: 'Accuracy Master',
    description: 'Achieve 90% accuracy in a session',
    icon: '◎',
    category: 'mastery',
    required: 90,
    progressDescription: 'session accuracy %',
    measure: c => Math.floor(c.lastSessionAccuracy ?? 0)
  }
];

export const ACHIEVEMENT_IDS = DEFINITIONS.map(definition => definition.id);

/** The full achievement list in its locked, zero-progress state. */
export function createAchievements(): Achievement[] {
  // `measure` must be dropped too: spreading the rest of a definition would
  // otherwise hang a function off every Achievement object.
  return DEFINITIONS.map(({ required, progressDescription, measure: _measure, ...rest }) => ({
    ...rest,
    progress: { current: 0, required, description: progressDescription }
  }));
}

/**
 * Recompute progress for every achievement and unlock any that qualify.
 *
 * Runs over all definitions rather than a hand-written list of checks, so an
 * achievement cannot be added and then silently never evaluated -- which is
 * what happened to `first_card`. Progress is refreshed even for achievements
 * that stay locked, and `unlockedAt` is never cleared once set.
 */
export function evaluateAchievements(
  existing: Achievement[],
  context: AchievementContext,
  now: Date = new Date()
): Achievement[] {
  const byId = new Map(existing.map(achievement => [achievement.id, achievement]));

  return DEFINITIONS.map(definition => {
    const previous = byId.get(definition.id);
    const measured = definition.measure(context);
    // Progress toward a peak-value achievement must not regress when the
    // current session scores lower than an earlier one.
    const current = Math.min(
      definition.required,
      Math.max(measured, previous?.progress.current ?? 0)
    );
    // Compare against the retained peak, so progress already at the target
    // unlocks even when this run measures lower.
    const unlockedAt = previous?.unlockedAt ?? (current >= definition.required ? now : undefined);

    return {
      id: definition.id,
      name: definition.name,
      description: definition.description,
      icon: definition.icon,
      category: definition.category,
      ...(unlockedAt ? { unlockedAt } : {}),
      progress: {
        current,
        required: definition.required,
        description: definition.progressDescription
      }
    };
  });
}
