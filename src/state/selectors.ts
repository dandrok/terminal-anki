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
      completedSessions.length > 0 ? studyMinutes / completedSessions.length : 0,
    achievements: state.data.achievements,
    recentSessions: sessions.slice(-10),
    tagDistribution: tagDistribution(state.data.cards),
    weeklyProgress: weeklyProgress(sessions, now)
  };
}
