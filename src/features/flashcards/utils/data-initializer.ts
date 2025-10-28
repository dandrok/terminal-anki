import { loadFlashcardData, createSampleCards, saveFlashcardData } from '../adapters';
import { Flashcard, StudySessionRecord, LearningStreak, Achievement } from '../domain';

interface InitializedData {
  cards: Flashcard[];
  sessionHistory: StudySessionRecord[];
  learningStreak: LearningStreak;
  achievements: Achievement[];
}

export const initializeFlashcardData = (): InitializedData => {
  let { cards, sessionHistory, learningStreak, achievements } = loadFlashcardData();

  if (cards.length === 0) {
    cards = createSampleCards();
    saveFlashcardData({ cards, sessionHistory, learningStreak, achievements });
  }

  return { cards, sessionHistory, learningStreak, achievements };
};
