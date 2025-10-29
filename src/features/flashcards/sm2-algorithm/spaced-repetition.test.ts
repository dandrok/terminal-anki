import { describe, it, expect } from 'vitest';
import {
  calculateNextReview,
  updateFlashcardProgress,
  isCardDue,
  getDaysUntilDue,
  getCardDifficulty,
  predictNextInterval,
  getRecommendedSessionSize,
  calculateCardPriority,
  sortCardsByPriority
} from './spaced-repetition.js';
import { Flashcard } from '../../../shared/types/flashcard.types.js';
import { addDays, subDays } from '../../../shared/utils/date-utils';

describe('SM-2 Spaced Repetition Algorithm', () => {
  const createMockCard = (overrides: Partial<Flashcard> = {}): Flashcard => ({
    id: 'test-1',
    front: 'Test Question',
    back: 'Test Answer',
    tags: ['test'],
    easiness: 2.5,
    interval: 1,
    repetitions: 0,
    nextReview: new Date(),
    lastReview: null,
    createdAt: new Date(),
    ...overrides
  });

  describe('calculateNextReview', () => {
    it('should calculate first successful review correctly', () => {
      const card = createMockCard({ repetitions: 0 });
      const result = calculateNextReview(card, 3);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.easiness).toBeCloseTo(2.36, 2); // 2.5 - 0.14
        expect(result.data.interval).toBe(1);
        expect(result.data.repetitions).toBe(1);
      }
    });

    it('should calculate second successful review correctly', () => {
      const card = createMockCard({ repetitions: 1, interval: 1, easiness: 2.5 });
      const result = calculateNextReview(card, 4);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.interval).toBe(6);
        expect(result.data.repetitions).toBe(2);
        expect(result.data.easiness).toBe(2.5); // unchanged for quality 4
      }
    });

    it('should calculate failed review correctly', () => {
      const card = createMockCard({ repetitions: 2, interval: 6, easiness: 2.5 });
      const result = calculateNextReview(card, 1);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.interval).toBe(1);
        expect(result.data.repetitions).toBe(0);
        expect(result.data.easiness).toBeCloseTo(1.96, 2); // 2.5 - 0.54 (for Q=1)
      }
    });

    it('should calculate third successful review with exponential growth', () => {
      const card = createMockCard({ repetitions: 2, interval: 6, easiness: 2.5 });
      const result = calculateNextReview(card, 5);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.interval).toBe(16); // Math.ceil(6 * 2.6)
        expect(result.data.repetitions).toBe(3);
        expect(result.data.easiness).toBeCloseTo(2.6, 2); // 2.5 + 0.1
      }
    });

    it('should never let easiness go below minimum', () => {
      const card = createMockCard({ easiness: 1.31 });
      const result = calculateNextReview(card, 0);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.easiness).toBeGreaterThanOrEqual(1.3);
      }
    });
  });

  describe('updateFlashcardProgress', () => {
    it('should update card with new SM-2 parameters', () => {
      const card = createMockCard({ repetitions: 0 });
      const result = updateFlashcardProgress(card, 3);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.repetitions).toBe(1);
        expect(result.data.lastReview).toBeInstanceOf(Date);
        expect(result.data.lastReview).not.toBeNull();
      }
    });
  });

  describe('isCardDue', () => {
    it('should identify due cards correctly', () => {
      const pastDate = subDays(new Date(), 1);
      const dueCard = createMockCard({ nextReview: pastDate });

      expect(isCardDue(dueCard)).toBe(true);
    });

    it('should identify future cards as not due', () => {
      const futureDate = addDays(new Date(), 1);
      const futureCard = createMockCard({ nextReview: futureDate });

      expect(isCardDue(futureCard)).toBe(false);
    });

    it('should identify cards due today as due', () => {
      const today = new Date();
      const dueTodayCard = createMockCard({ nextReview: today });

      expect(isCardDue(dueTodayCard)).toBe(true);
    });
  });

  describe('getDaysUntilDue', () => {
    it('should return negative days for overdue cards', () => {
      const pastDate = subDays(new Date(), 2);
      const overdueCard = createMockCard({ nextReview: pastDate });

      expect(getDaysUntilDue(overdueCard)).toBeLessThan(0);
    });

    it('should return 0 for cards due today', () => {
      const today = new Date();
      const dueTodayCard = createMockCard({ nextReview: today });

      expect(getDaysUntilDue(dueTodayCard)).toBe(0);
    });

    it('should return positive days for future cards', () => {
      const futureDate = addDays(new Date(), 3);
      const futureCard = createMockCard({ nextReview: futureDate });

      expect(getDaysUntilDue(futureCard)).toBeGreaterThan(0);
    });
  });

  describe('getCardDifficulty', () => {
    it('should classify new cards correctly', () => {
      const newCard = createMockCard({ interval: 1 });
      expect(getCardDifficulty(newCard)).toBe('new');
    });

    it('should classify learning cards correctly', () => {
      const learningCard = createMockCard({ interval: 5 });
      expect(getCardDifficulty(learningCard)).toBe('learning');
    });

    it('should classify young cards correctly', () => {
      const youngCard = createMockCard({ interval: 15 });
      expect(getCardDifficulty(youngCard)).toBe('young');
    });

    it('should classify mature cards correctly', () => {
      const matureCard = createMockCard({ interval: 45 });
      expect(getCardDifficulty(matureCard)).toBe('mature');
    });
  });

  describe('predictNextInterval', () => {
    it('should predict correct interval for first review', () => {
      const interval = predictNextInterval(1, 2.5, 0, 3);
      expect(interval).toBe(1);
    });

    it('should predict correct interval for second review', () => {
      const interval = predictNextInterval(1, 2.5, 1, 4);
      expect(interval).toBe(6);
    });

    it('should predict exponential growth for third+ reviews', () => {
      const interval = predictNextInterval(6, 2.5, 2, 3);
      expect(interval).toBe(15); // 6 * 2.5
    });

    it('should reset on failed review', () => {
      const interval = predictNextInterval(15, 2.5, 3, 1);
      expect(interval).toBe(1);
    });
  });

  describe('getRecommendedSessionSize', () => {
    it('should return all cards for small sets', () => {
      expect(getRecommendedSessionSize(5)).toBe(5);
      expect(getRecommendedSessionSize(10)).toBe(10);
    });

    it('should cap at standard session size for medium sets', () => {
      expect(getRecommendedSessionSize(15)).toBe(25);
      expect(getRecommendedSessionSize(25)).toBe(25);
    });

    it('should cap at intensive session size for larger sets', () => {
      expect(getRecommendedSessionSize(30)).toBe(50);
      expect(getRecommendedSessionSize(50)).toBe(50);
    });

    it('should use percentage for very large sets', () => {
      expect(getRecommendedSessionSize(200)).toBe(60); // 200 * 0.3
      expect(getRecommendedSessionSize(500)).toBe(100); // capped at 100
    });
  });

  describe('calculateCardPriority', () => {
    it('should give higher priority to overdue cards', () => {
      const overdueCard = createMockCard({
        nextReview: subDays(new Date(), 2)
      });
      const dueCard = createMockCard({
        nextReview: new Date()
      });

      expect(calculateCardPriority(overdueCard)).toBeGreaterThan(calculateCardPriority(dueCard));
    });

    it('should give priority to new cards', () => {
      const newCard = createMockCard({ interval: 1 });
      const matureCard = createMockCard({ interval: 45 });

      expect(calculateCardPriority(newCard)).toBeGreaterThan(calculateCardPriority(matureCard));
    });
  });

  describe('sortCardsByPriority', () => {
    it('should sort cards by priority in descending order', () => {
      const overdueCard = createMockCard({
        id: 'overdue',
        nextReview: subDays(new Date(), 2)
      });
      const newCard = createMockCard({
        id: 'new',
        interval: 1,
        nextReview: new Date()
      });
      const matureCard = createMockCard({
        id: 'mature',
        interval: 45,
        nextReview: addDays(new Date(), 5)
      });

      const sorted = sortCardsByPriority([matureCard, newCard, overdueCard]);

      expect(sorted[0].id).toBe('overdue');
      expect(sorted[1].id).toBe('new');
      expect(sorted[2].id).toBe('mature');
    });
  });
});
