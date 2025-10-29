import {
  Flashcard,
  CustomStudyFilters,
  ReviewQuality,
  StudySessionRecord,
  LearningStreak,
  Achievement
} from '../domain';
import { updateSpacedRepetition } from './spaced-repetition-service';
import { checkAchievements } from './achievement-service';
import { updateLearningStreak } from './learning-streak-service';
import { getBasicStats, getExtendedStats } from './stats-service';
import { recordStudySession } from './session-service';
import { initializeFlashcardData } from '../utils/data-initializer';
import { saveFlashcardData } from '../adapters/flashcard-data-fs';

interface FlashcardServiceState {
  cards: Flashcard[];
  sessionHistory: StudySessionRecord[];
  learningStreak: LearningStreak;
  achievements: Achievement[];
}

let state: FlashcardServiceState; // Declare without immediate initialization

// Function to initialize or reset the state, useful for testing
export const resetState = (initialData?: FlashcardServiceState) => {
  if (initialData) {
    state = initialData;
  } else {
    state = initializeFlashcardData(); // Default initialization
  }
};

// Initialize state when the module loads for the first time
resetState();

const saveData = () => {
  saveFlashcardData({
    cards: state.cards,
    sessionHistory: state.sessionHistory,
    learningStreak: state.learningStreak,
    achievements: state.achievements
  });
};

export const getAllCards = (): Flashcard[] => {
  return [...state.cards];
};

export const getDueCards = (referenceDate: Date = new Date()): Flashcard[] => {
  return state.cards.filter(card => card.nextReview <= referenceDate);
};

export const addCard = (front: string, back: string, tags: string[] = []): Flashcard => {
  const newCard: Flashcard = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    front,
    back,
    tags: tags.map(tag => tag.trim().toLowerCase()).filter(tag => tag.length > 0),
    easiness: 2.5,
    interval: 1,
    repetitions: 0,
    nextReview: new Date(),
    lastReview: null,
    createdAt: new Date()
  };

  state.cards.push(newCard);
  // Check for 'first_card' achievement
  const firstCardAchievement = state.achievements.find(a => a.id === 'first_card');
  if (firstCardAchievement && !firstCardAchievement.unlockedAt) {
    firstCardAchievement.progress.current = 1;
    firstCardAchievement.unlockedAt = new Date();
  }
  saveData();
  return newCard;
};

export const deleteCard = (id: string): boolean => {
  const index = state.cards.findIndex(card => card.id === id);
  if (index !== -1) {
    state.cards.splice(index, 1);
    saveData();
    return true;
  }
  return false;
};

export const searchCards = (query: string): Flashcard[] => {
  const lowerQuery = query.toLowerCase();
  return state.cards.filter(
    card =>
      card.front.toLowerCase().includes(lowerQuery) ||
      card.back.toLowerCase().includes(lowerQuery) ||
      card.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
};

export const processCardReview = (
  cardId: string,
  quality: ReviewQuality
): Flashcard | undefined => {
  const card = state.cards.find(c => c.id === cardId);
  if (!card) return undefined;

  const updatedCard = updateSpacedRepetition(card, quality);
  saveData();
  return updatedCard;
};

export const getAllTags = (): string[] => {
  const allTags = new Set<string>();
  state.cards.forEach(card => {
    card.tags.forEach(tag => allTags.add(tag));
  });
  return Array.from(allTags).sort();
};

export const getFilteredCards = (filters: CustomStudyFilters): Flashcard[] => {
  let filteredCards = [...state.cards];

  // Filter by tags
  if (filters.tags && filters.tags.length > 0) {
    filteredCards = filteredCards.filter(card =>
      filters.tags!.some(tag => card.tags.includes(tag.toLowerCase()))
    );
  }

  // Filter by difficulty
  if (filters.difficulty) {
    filteredCards = filteredCards.filter(card => {
      switch (filters.difficulty) {
        case 'new':
          return card.interval <= 1;
        case 'learning':
          return card.interval > 1 && card.interval <= 7;
        case 'young':
          return card.interval > 7 && card.interval <= 30;
        case 'mature':
          return card.interval > 30;
        default:
          return true;
      }
    });
  }

  // Apply limit
  if (filters.limit && filters.limit > 0) {
    filteredCards = filteredCards.slice(0, filters.limit);
  }

  // Random order if requested
  if (filters.randomOrder) {
    filteredCards.sort(() => Math.random() - 0.5);
  }

  return filteredCards;
};

export const recordAndProcessStudySession = (
  sessionData: Omit<StudySessionRecord, 'id'>
): StudySessionRecord => {
  const newSession = recordStudySession(sessionData);
  state.sessionHistory.push(newSession);

  state.learningStreak = updateLearningStreak(state.learningStreak, newSession.startTime);
  state.achievements = checkAchievements(
    state.achievements,
    state.cards,
    state.sessionHistory,
    state.learningStreak,
    newSession
  );

  // Keep only last 100 sessions in history
  if (state.sessionHistory.length > 100) {
    state.sessionHistory = state.sessionHistory.slice(-100);
  }

  saveData();
  return newSession;
};

export const getFlashcardStats = () => getBasicStats(state.cards);

export const getFlashcardExtendedStats = () =>
  getExtendedStats(state.cards, state.sessionHistory, state.learningStreak, state.achievements);

export const updateCardTags = (cardId: string, tags: string[]): boolean => {
  const card = state.cards.find(c => c.id === cardId);
  if (!card) return false;

  card.tags = tags.map(tag => tag.trim().toLowerCase()).filter(tag => tag.length > 0);
  saveData();
  return true;
};

export const getCardsByTag = (tag: string): Flashcard[] => {
  return state.cards.filter(card => card.tags.includes(tag.toLowerCase()));
};

export const getCardsByDifficulty = (
  difficulty: 'new' | 'learning' | 'young' | 'mature'
): Flashcard[] => {
  return state.cards.filter(card => {
    switch (difficulty) {
      case 'new':
        return card.interval <= 1;
      case 'learning':
        return card.interval > 1 && card.interval <= 7;
      case 'young':
        return card.interval > 7 && card.interval <= 30;
      case 'mature':
        return card.interval > 30;
      default:
        return true;
    }
  });
};
