import { describe, it, expect, vi, beforeEach } from 'vitest';
import { initializeFlashcardData } from './data-initializer';
import * as dataAdapters from '../adapters/flashcard-data-fs';
import { Flashcard, StudySessionRecord, LearningStreak, Achievement } from '../domain';

describe('data-initializer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should load existing data if available', () => {
    const mockCards: Flashcard[] = [{
      id: '1', front: 'Q', back: 'A', tags: [], easiness: 2.5, interval: 1, repetitions: 0,
      nextReview: new Date(), lastReview: null, createdAt: new Date()
    }];
    const mockSessionHistory: StudySessionRecord[] = [];
    const mockLearningStreak: LearningStreak = { currentStreak: 0, longestStreak: 0, lastStudyDate: null, studyDates: [] };
    const mockAchievements: Achievement[] = [];

    vi.spyOn(dataAdapters, 'loadFlashcardData').mockReturnValue({
      cards: mockCards,
      sessionHistory: mockSessionHistory,
      learningStreak: mockLearningStreak,
      achievements: mockAchievements,
    });
    vi.spyOn(dataAdapters, 'createSampleCards').mockReturnValue([]);
    vi.spyOn(dataAdapters, 'saveFlashcardData').mockReturnValue(undefined);

    const result = initializeFlashcardData();

    expect(dataAdapters.loadFlashcardData).toHaveBeenCalled();
    expect(dataAdapters.createSampleCards).not.toHaveBeenCalled();
    expect(dataAdapters.saveFlashcardData).not.toHaveBeenCalled();
    expect(result.cards).toEqual(mockCards);
  });

  it('should create sample cards and save if no existing cards', () => {
    const sampleCards: Flashcard[] = [{
      id: 's1', front: 'Sample Q', back: 'Sample A', tags: [], easiness: 2.5, interval: 1, repetitions: 0,
      nextReview: new Date(), lastReview: null, createdAt: new Date()
    }];

    vi.spyOn(dataAdapters, 'loadFlashcardData').mockReturnValue({
      cards: [],
      sessionHistory: [],
      learningStreak: { currentStreak: 0, longestStreak: 0, lastStudyDate: null, studyDates: [] },
      achievements: [],
    });
    vi.spyOn(dataAdapters, 'createSampleCards').mockReturnValue(sampleCards);
    vi.spyOn(dataAdapters, 'saveFlashcardData').mockReturnValue(undefined);

    const result = initializeFlashcardData();

    expect(dataAdapters.loadFlashcardData).toHaveBeenCalled();
    expect(dataAdapters.createSampleCards).toHaveBeenCalled();
    expect(dataAdapters.saveFlashcardData).toHaveBeenCalledWith(expect.objectContaining({ cards: sampleCards }));
    expect(result.cards).toEqual(sampleCards);
  });

  it('should return empty data if load fails and no sample cards are created', () => {
    vi.spyOn(dataAdapters, 'loadFlashcardData').mockReturnValue({
      cards: [],
      sessionHistory: [],
      learningStreak: { currentStreak: 0, longestStreak: 0, lastStudyDate: null, studyDates: [] },
      achievements: [],
    });
    vi.spyOn(dataAdapters, 'createSampleCards').mockReturnValue([]);
    vi.spyOn(dataAdapters, 'saveFlashcardData').mockReturnValue(undefined);

    const result = initializeFlashcardData();

    expect(dataAdapters.loadFlashcardData).toHaveBeenCalled();
    expect(dataAdapters.createSampleCards).toHaveBeenCalled();
    expect(dataAdapters.saveFlashcardData).toHaveBeenCalledWith(expect.objectContaining({ cards: [] }));
    expect(result.cards).toEqual([]);
  });
});