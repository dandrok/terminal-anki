import {
  applyFilters,
  cardsByDifficulty,
  cardsByTag,
  collectTags,
  dueCards,
  searchCards
} from '../core/filters.js';
import {
  computeCardStats,
  tagDistribution,
  totalStudyMinutes,
  weeklyProgress
} from '../core/stats.js';
import { effectiveStreak } from '../core/streaks.js';
import { dailyRollups, rollupAccuracy, type DailyRollup } from '../core/rollups.js';
import type {
  CardStats,
  CustomStudyFilters,
  DifficultyLevel,
  ExtendedStats,
  Flashcard
} from '../types/index.js';
import type { AppState } from './reducer.js';

export const selectCards = (state: AppState): readonly Flashcard[] => state.data.cards;

export const selectDueCards = (state: AppState, now: Date = new Date()): Flashcard[] =>
  dueCards(state.data.cards, now);

export const selectCardById = (state: AppState, id: string): Flashcard | undefined =>
  state.data.cards.find(card => card.id === id);

export const selectAllTags = (state: AppState): string[] => collectTags(state.data.cards);

export const selectCardsByTag = (state: AppState, tag: string): Flashcard[] =>
  cardsByTag(state.data.cards, tag);

export const selectCardsByDifficulty = (
  state: AppState,
  difficulty: DifficultyLevel
): Flashcard[] => cardsByDifficulty(state.data.cards, difficulty);

export const selectSearchResults = (state: AppState, query: string): Flashcard[] =>
  searchCards(state.data.cards, query);

export const selectFilteredCards = (
  state: AppState,
  filters: CustomStudyFilters,
  now: Date = new Date()
): Flashcard[] => applyFilters(state.data.cards, filters, { now });

export const selectStats = (state: AppState, now: Date = new Date()): CardStats =>
  computeCardStats(state.data.cards, now);

export const selectCanUndo = (state: AppState): boolean => state.undo.length > 0;

export function selectExtendedStats(state: AppState, now: Date = new Date()): ExtendedStats {
  const sessions = state.data.sessionHistory;
  const completedSessions = sessions.filter(session => !session.quitEarly);
  const studyMinutes = totalStudyMinutes(sessions);
  // Averaged over completed sessions only, so numerator and denominator agree.
  // Dividing all-session minutes by the completed count inflated the figure.
  const completedMinutes = totalStudyMinutes(completedSessions);

  return {
    ...computeCardStats(state.data.cards, now),
    learningStreak: {
      ...state.data.learningStreak,
      // A stored streak keeps its last value forever; zero it once lapsed.
      currentStreak: effectiveStreak(state.data.learningStreak, now)
    },
    totalStudyTime: studyMinutes,
    sessionsCompleted: completedSessions.length,
    averageSessionLength:
      completedSessions.length > 0 ? completedMinutes / completedSessions.length : 0,
    achievements: state.data.achievements,
    recentSessions: sessions.slice(-10),
    tagDistribution: tagDistribution(state.data.cards),
    weeklyProgress: weeklyProgress(sessions, now)
  };
}

/** Per-day study totals, derived from the session log. */
export const selectDailyRollups = (state: AppState): Map<string, DailyRollup> =>
  dailyRollups(state.data.sessionHistory);

/** Just the card counts, in the shape the heatmap wants. */
export function selectDailyCardCounts(state: AppState): Map<string, number> {
  const counts = new Map<string, number>();
  for (const [date, rollup] of selectDailyRollups(state)) {
    counts.set(date, rollup.cardsStudied);
  }
  return counts;
}

/**
 * Accuracy per day, most recent last, for days that had any study.
 *
 * Days with no reviews are left out rather than plotted as 0%: a rest day is
 * not a day you got everything wrong.
 */
export function selectAccuracyTrend(
  state: AppState,
  days = 14
): { date: string; accuracy: number; cards: number }[] {
  return [...selectDailyRollups(state).values()]
    .filter(rollup => rollup.cardsStudied > 0)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-days)
    .map(rollup => ({
      date: rollup.date,
      accuracy: rollupAccuracy([rollup]),
      cards: rollup.cardsStudied
    }));
}
