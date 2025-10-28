import { describe, it, expect, beforeEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadFlashcardData, saveFlashcardData, createSampleCards } from './flashcard-data-fs';
import { Flashcard, StudySessionRecord, LearningStreak, Achievement } from '../domain';

// Mock fs module
vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
  },
}));

const mockDataFile = path.join(
  fileURLToPath(import.meta.url),
  '..',
  '..',
  '..',
  '..',
  'flashcards.json'
);

describe('flashcard-data-fs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loadFlashcardData', () => {
    it('should return empty data if file does not exist', () => {
      (fs.existsSync as vi.Mock).mockReturnValue(false);
      const data = loadFlashcardData();
      expect(data).toEqual({
        cards: [],
        sessionHistory: [],
        learningStreak: { currentStreak: 0, longestStreak: 0, lastStudyDate: null, studyDates: [] },
        achievements: [],
      });
      expect(fs.existsSync).toHaveBeenCalledWith(expect.stringContaining('flashcards.json'));
    });

    it('should load data from file and revive dates', () => {
      const mockFlashcard: Flashcard = {
        id: '1',
        front: 'Test',
        back: 'Answer',
        tags: ['tag1'],
        easiness: 2.5,
        interval: 1,
        repetitions: 0,
        nextReview: new Date('2025-01-01T00:00:00.000Z'),
        lastReview: new Date('2024-12-31T00:00:00.000Z'),
        createdAt: new Date('2024-12-30T00:00:00.000Z'),
      };
      const mockSession: StudySessionRecord = {
        id: 's1',
        startTime: new Date('2025-01-01T00:00:00.000Z'),
        endTime: new Date('2025-01-01T00:10:00.000Z'),
        cardsStudied: 1,
        correctAnswers: 1,
        incorrectAnswers: 0,
        averageDifficulty: 0,
        sessionType: 'due',
        quitEarly: false,
      };
      const mockLearningStreak: LearningStreak = {
        currentStreak: 1,
        longestStreak: 1,
        lastStudyDate: new Date('2025-01-01T00:00:00.000Z'),
        studyDates: ['2025-01-01'],
      };
      const mockAchievement: Achievement = {
        id: 'a1',
        name: 'Ach1',
        description: 'Desc1',
        icon: 'i',
        category: 'cards',
        progress: { current: 1, required: 1, description: 'd' },
      };

      const mockFileData = {
        cards: [mockFlashcard],
        sessionHistory: [mockSession],
        learningStreak: mockLearningStreak,
        achievements: [mockAchievement],
      };

      (fs.existsSync as vi.Mock).mockReturnValue(true);
      (fs.readFileSync as vi.Mock).mockReturnValue(JSON.stringify(mockFileData));

      const data = loadFlashcardData();

      expect(data.cards[0].nextReview).toBeInstanceOf(Date);
      expect(data.cards[0].lastReview).toBeInstanceOf(Date);
      expect(data.cards[0].createdAt).toBeInstanceOf(Date);
      expect(data.sessionHistory[0].startTime).toBeInstanceOf(Date);
      expect(data.sessionHistory[0].endTime).toBeInstanceOf(Date);
      expect(data.learningStreak.lastStudyDate).toBeInstanceOf(Date);
      expect(data).toEqual(mockFileData);
    });

    it('should handle errors during file reading', () => {
      (fs.existsSync as vi.Mock).mockReturnValue(true);
      (fs.readFileSync as vi.Mock).mockImplementation(() => {
        throw new Error('Read error');
      });
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const data = loadFlashcardData();
      expect(data).toEqual({
        cards: [],
        sessionHistory: [],
        learningStreak: { currentStreak: 0, longestStreak: 0, lastStudyDate: null, studyDates: [] },
        achievements: [],
      });
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error loading data:', expect.any(Error));
      consoleErrorSpy.mockRestore();
    });
  });

  describe('saveFlashcardData', () => {
    it('should save data to file', () => {
      const mockData = {
        cards: [],
        sessionHistory: [],
        learningStreak: { currentStreak: 0, longestStreak: 0, lastStudyDate: null, studyDates: [] },
        achievements: [],
      };
      saveFlashcardData(mockData);
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('flashcards.json'),
        JSON.stringify(mockData, null, 2)
      );
    });

    it('should handle errors during file writing', () => {
      (fs.writeFileSync as vi.Mock).mockImplementation(() => {
        throw new Error('Write error');
      });
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      saveFlashcardData({
        cards: [],
        sessionHistory: [],
        learningStreak: { currentStreak: 0, longestStreak: 0, lastStudyDate: null, studyDates: [] },
        achievements: [],
      });
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error saving data:', expect.any(Error));
      consoleErrorSpy.mockRestore();
    });
  });

  describe('createSampleCards', () => {
    it('should return an array of sample flashcards', () => {
      const sampleCards = createSampleCards();
      expect(sampleCards).toHaveLength(5);
      expect(sampleCards[0]).toHaveProperty('id');
      expect(sampleCards[0]).toHaveProperty('front');
      expect(sampleCards[0]).toHaveProperty('back');
      expect(sampleCards[0]).toHaveProperty('tags');
      expect(sampleCards[0].nextReview).toBeInstanceOf(Date);
      expect(sampleCards[0].createdAt).toBeInstanceOf(Date);
    });
  });
});