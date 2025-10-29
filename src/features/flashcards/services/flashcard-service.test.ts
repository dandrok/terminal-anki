import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  Flashcard,
  StudySessionRecord,
  LearningStreak,
  Achievement,
  CustomStudyFilters
} from '../domain';

// Mock dependencies
vi.mock('../utils/data-initializer');
vi.mock('../adapters/flashcard-data-fs');
vi.mock('./spaced-repetition-service');
vi.mock('./achievement-service');
vi.mock('./learning-streak-service');
vi.mock('./stats-service');
vi.mock('./session-service');

// Import the functions to be tested
import {
  getAllCards,
  getDueCards,
  addCard,
  deleteCard,
  searchCards,
  processCardReview,
  getAllTags,
  getFilteredCards,
  recordAndProcessStudySession,
  getFlashcardStats,
  getFlashcardExtendedStats,
  updateCardTags,
  getCardsByTag,
  getCardsByDifficulty,
  resetState
} from './flashcard-service';

// Keep references to actual implementations for mocking
import * as dataInitializer from '../utils/data-initializer';
import * as dataAdapters from '../adapters/flashcard-data-fs';
import * as spacedRepetitionService from './spaced-repetition-service';
import * as achievementService from './achievement-service';
import * as learningStreakService from './learning-streak-service';
import * as statsService from './stats-service';
import * as sessionService from './session-service';

describe('flashcard-service', () => {
  let mockCards: Flashcard[];
  let mockSessionHistory: StudySessionRecord[];
  let mockLearningStreak: LearningStreak;
  let mockAchievements: Achievement[];

  const createMockCard = (id: string, overrides: Partial<Flashcard> = {}): Flashcard => ({
    id,
    front: `Q${id}`,
    back: `A${id}`,
    tags: [],
    easiness: 2.5,
    interval: 1,
    repetitions: 0,
    nextReview: new Date(),
    lastReview: null,
    createdAt: new Date(),
    ...overrides
  });

  const createMockSession = (
    id: string,
    overrides: Partial<StudySessionRecord> = {}
  ): StudySessionRecord => ({
    id,
    startTime: new Date(),
    endTime: new Date(),
    cardsStudied: 1,
    correctAnswers: 1,
    incorrectAnswers: 0,
    averageDifficulty: 2.5,
    sessionType: 'due',
    quitEarly: false,
    ...overrides
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.setSystemTime(new Date('2025-01-01T12:00:00.000Z'));

    mockCards = [
      createMockCard('1', { tags: ['js'], nextReview: new Date('2025-01-02T12:00:00.000Z') }), // Future date - not due
      createMockCard('2', { nextReview: new Date('2024-12-31T12:00:00.000Z'), tags: ['node'] }), // Past date - due
      createMockCard('3', { tags: ['js', 'web'], nextReview: new Date('2025-01-02T12:00:00.000Z') }) // Future date - not due
    ];
    mockSessionHistory = [createMockSession('s1')];
    mockLearningStreak = {
      currentStreak: 1,
      longestStreak: 1,
      lastStudyDate: new Date(),
      studyDates: ['2025-01-01']
    };
    mockAchievements = [
      {
        id: 'first_card',
        name: 'First Steps',
        description: '',
        icon: '',
        category: 'cards',
        progress: { current: 0, required: 1, description: '' }
      }
    ];

    // Mock initializeFlashcardData to return our test state initially
    vi.spyOn(dataInitializer, 'initializeFlashcardData').mockReturnValue({
      cards: mockCards,
      sessionHistory: mockSessionHistory,
      learningStreak: mockLearningStreak,
      achievements: mockAchievements
    });

    (dataAdapters.saveFlashcardData as vi.Mock).mockReturnValue(undefined);
    (spacedRepetitionService.updateSpacedRepetition as vi.Mock).mockImplementation(card => ({
      ...card,
      repetitions: card.repetitions + 1
    }));
    (achievementService.checkAchievements as vi.Mock).mockImplementation(ach => ach);
    (learningStreakService.updateLearningStreak as vi.Mock).mockImplementation(ls => ls);
    (statsService.getBasicStats as vi.Mock).mockReturnValue({});
    (statsService.getExtendedStats as vi.Mock).mockReturnValue({});
    (sessionService.recordStudySession as vi.Mock).mockImplementation(data => ({
      ...data,
      id: 'new-session-id'
    }));

    // Call resetState immediately to set initial state after mocks are in place
    resetState();
  });

  it('getAllCards should return all cards', () => {
    expect(getAllCards()).toEqual(mockCards);
  });

  it('getDueCards should return only due cards', () => {
    const referenceDate = new Date('2025-01-01T12:00:00.000Z');
    const dueCards = getDueCards(referenceDate);
    expect(dueCards).toHaveLength(1);
    expect(dueCards[0].id).toBe('2');
  });

  it('addCard should add a new card and save data', () => {
    const initialLength = getAllCards().length;
    const newCard = addCard('Q4', 'A4', ['new']);
    expect(newCard.front).toBe('Q4');
    expect(getAllCards()).toHaveLength(initialLength + 1);
    expect(dataAdapters.saveFlashcardData).toHaveBeenCalled();
    const firstCardAch = mockAchievements.find(a => a.id === 'first_card');
    expect(firstCardAch?.unlockedAt).toBeInstanceOf(Date);
  });

  it('deleteCard should remove a card and save data', () => {
    const initialLength = getAllCards().length;
    const success = deleteCard('1');
    expect(success).toBe(true);
    expect(getAllCards()).toHaveLength(initialLength - 1);
    expect(dataAdapters.saveFlashcardData).toHaveBeenCalled();
  });

  it('deleteCard should return false if card not found', () => {
    const success = deleteCard('non-existent-id');
    expect(success).toBe(false);
    expect(dataAdapters.saveFlashcardData).not.toHaveBeenCalled();
  });

  it('searchCards should return matching cards by tag', () => {
    const results = searchCards('js');
    expect(results).toHaveLength(2);
    expect(results.map(c => c.id).sort()).toEqual(['1', '3']);
  });

  it('processCardReview should update card and save data', () => {
    const cardId = '1';
    const quality = 3;
    const updatedCard = processCardReview(cardId, quality);
    expect(spacedRepetitionService.updateSpacedRepetition).toHaveBeenCalledWith(
      expect.objectContaining({ id: cardId }),
      quality
    );
    expect(dataAdapters.saveFlashcardData).toHaveBeenCalled();
    expect(updatedCard?.repetitions).toBe(1); // Due to mock implementation
  });

  it('processCardReview should return undefined if card not found', () => {
    const updatedCard = processCardReview('non-existent', 3);
    expect(updatedCard).toBeUndefined();
    expect(spacedRepetitionService.updateSpacedRepetition).not.toHaveBeenCalled();
  });

  it('getAllTags should return all unique tags', () => {
    const tags = getAllTags();
    expect(tags).toEqual(['js', 'node', 'web']);
  });

  it('getFilteredCards should filter by tags', () => {
    const filters: CustomStudyFilters = { tags: ['js'] };
    const filtered = getFilteredCards(filters);
    expect(filtered).toHaveLength(2);
    expect(filtered[0].id).toBe('1');
    expect(filtered[1].id).toBe('3');
  });

  it('getFilteredCards should filter by difficulty', () => {
    const filters: CustomStudyFilters = { difficulty: 'new' };
    const filtered = getFilteredCards(filters);
    // Assuming mock cards have interval 1, so they are 'new'
    expect(filtered).toHaveLength(3);
  });

  it('getFilteredCards should apply limit', () => {
    const filters: CustomStudyFilters = { limit: 1 };
    const filtered = getFilteredCards(filters);
    expect(filtered).toHaveLength(1);
  });

  it('getFilteredCards should randomize order', () => {
    const filters: CustomStudyFilters = { randomOrder: true };
    const originalOrder = getFilteredCards({ ...filters, randomOrder: false });

    // Mock Math.random with values that will ensure sorting
    // The sort uses Math.random() - 0.5, so we need values that produce different results
    const randomValues = [-0.3, 0.2, -0.1]; // Math.random() values will be [0.2, 0.7, 0.4]
    let callCount = 0;
    const mathRandomSpy = vi.spyOn(Math, 'random').mockImplementation(() => {
      return randomValues[callCount++ % randomValues.length] + 0.5;
    });

    const filtered1 = getFilteredCards(filters);
    callCount = 0; // Reset call count for second call
    const filtered2 = getFilteredCards(filters);

    // With a predictable random, the order should be consistently different from the original
    expect(filtered1.map(c => c.id)).not.toEqual(originalOrder.map(c => c.id));
    // And the same shuffled order should be produced each time
    expect(filtered1.map(c => c.id)).toEqual(filtered2.map(c => c.id));

    mathRandomSpy.mockRestore(); // Restore original Math.random
  });

  it('recordAndProcessStudySession should record session, update streak, check achievements and save data', () => {
    const sessionData: Omit<StudySessionRecord, 'id'> = createMockSession('new-session', {
      cardsStudied: 5,
      correctAnswers: 4
    });
    const newSession = recordAndProcessStudySession(sessionData);

    expect(sessionService.recordStudySession).toHaveBeenCalledWith(sessionData);
    expect(learningStreakService.updateLearningStreak).toHaveBeenCalled();
    expect(achievementService.checkAchievements).toHaveBeenCalled();
    expect(dataAdapters.saveFlashcardData).toHaveBeenCalled();
    expect(newSession.id).toBe('new-session-id');
    expect(mockSessionHistory).toHaveLength(2); // Initial + new
  });

  it('getFlashcardStats should return basic stats', () => {
    getFlashcardStats();
    expect(statsService.getBasicStats).toHaveBeenCalledWith(mockCards);
  });

  it('getFlashcardExtendedStats should return extended stats', () => {
    getFlashcardExtendedStats();
    expect(statsService.getExtendedStats).toHaveBeenCalledWith(
      mockCards,
      mockSessionHistory,
      mockLearningStreak,
      mockAchievements
    );
  });

  it('updateCardTags should update tags and save data', () => {
    const cardId = '1';
    const newTags = ['css', 'frontend'];
    const success = updateCardTags(cardId, newTags);
    expect(success).toBe(true);
    expect(mockCards[0].tags).toEqual(newTags);
    expect(dataAdapters.saveFlashcardData).toHaveBeenCalled();
  });

  it('updateCardTags should return false if card not found', () => {
    const success = updateCardTags('non-existent', ['tag']);
    expect(success).toBe(false);
    expect(dataAdapters.saveFlashcardData).not.toHaveBeenCalled();
  });

  it('getCardsByTag should return cards with specific tag', () => {
    const cards = getCardsByTag('js');
    expect(cards).toHaveLength(2);
    expect(cards[0].id).toBe('1');
    expect(cards[1].id).toBe('3');
  });

  it('getCardsByDifficulty should return cards of specific difficulty', () => {
    // Assuming all mock cards are 'new' based on interval 1
    const cards = getCardsByDifficulty('new');
    expect(cards).toHaveLength(3);
  });
});
