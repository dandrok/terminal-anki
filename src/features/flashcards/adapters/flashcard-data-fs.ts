import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Flashcard, StudySessionRecord, LearningStreak, Achievement } from '../domain';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataFile = path.join(__dirname, '..', '..', '..', 'flashcards.json'); // Adjust path as needed

interface FlashcardData {
  cards: Flashcard[];
  sessionHistory: StudySessionRecord[];
  learningStreak: LearningStreak;
  achievements: Achievement[];
}

export const loadFlashcardData = (): FlashcardData => {
  try {
    if (fs.existsSync(dataFile)) {
      const data = JSON.parse(fs.readFileSync(dataFile, 'utf-8'));

      const cards: Flashcard[] =
        data.cards?.map((card: any) => ({
          ...card,
          tags: card.tags || [],
          nextReview: new Date(card.nextReview),
          lastReview: card.lastReview ? new Date(card.lastReview) : null,
          createdAt: new Date(card.createdAt)
        })) || [];

      const sessionHistory: StudySessionRecord[] =
        data.sessionHistory?.map((session: any) => ({
          ...session,
          startTime: new Date(session.startTime),
          endTime: session.endTime ? new Date(session.endTime) : undefined
        })) || [];

      const learningStreak: LearningStreak = data.learningStreak || {
        currentStreak: 0,
        longestStreak: 0,
        lastStudyDate: null,
        studyDates: []
      };
      if (learningStreak.lastStudyDate) {
        learningStreak.lastStudyDate = new Date(learningStreak.lastStudyDate);
      }

      const achievements: Achievement[] = data.achievements || [];

      return { cards, sessionHistory, learningStreak, achievements };
    }
  } catch (error) {
    console.error('Error loading data:', error);
  }
  return {
    cards: [],
    sessionHistory: [],
    learningStreak: { currentStreak: 0, longestStreak: 0, lastStudyDate: null, studyDates: [] },
    achievements: []
  };
};

export const saveFlashcardData = (data: FlashcardData): void => {
  try {
    fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error saving data:', error);
  }
};

export const createSampleCards = (): Flashcard[] => {
  const sampleCardsData = [
    {
      front: 'Python',
      back: 'A high-level programming language',
      tags: ['programming', 'python']
    },
    {
      front: 'Algorithm',
      back: 'A step-by-step procedure for solving a problem',
      tags: ['computer-science', 'algorithms']
    },
    {
      front: 'Database',
      back: 'An organized collection of structured information',
      tags: ['database', 'storage']
    },
    { front: 'API', back: 'Application Programming Interface', tags: ['programming', 'web'] },
    {
      front: 'Git',
      back: 'A distributed version control system',
      tags: ['tools', 'version-control']
    }
  ];

  return sampleCardsData.map((card, index) => ({
    id: (index + 1).toString(),
    front: card.front,
    back: card.back,
    tags: card.tags,
    easiness: 2.5,
    interval: 1,
    repetitions: 0,
    nextReview: new Date(),
    lastReview: null,
    createdAt: new Date()
  }));
};
