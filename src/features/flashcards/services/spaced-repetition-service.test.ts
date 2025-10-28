import { describe, it, expect, beforeEach, vi } from 'vitest';
import { updateSpacedRepetition } from './spaced-repetition-service';
import { Flashcard, ReviewQuality } from '../domain';

describe('updateSpacedRepetition', () => {
  let card: Flashcard;
  const now = new Date();

  beforeEach(() => {
    vi.setSystemTime(now);
    card = {
      id: '1',
      front: 'Test Question',
      back: 'Test Answer',
      tags: [],
      easiness: 2.5,
      interval: 0,
      repetitions: 0,
      nextReview: new Date(now.getTime() - 1000), // Due
      lastReview: null,
      createdAt: new Date(now.getTime() - 100000),
    };
  });

  it('should update card properties correctly for quality 5 (perfect)', () => {
    const updatedCard = updateSpacedRepetition(card, 5);

    expect(updatedCard.lastReview).toEqual(now);
    expect(updatedCard.repetitions).toBe(1);
    expect(updatedCard.interval).toBe(1); // First repetition, interval is 1
    expect(updatedCard.easiness).toBeCloseTo(2.6); // 2.5 + (0.1 - (0) * (0.08 + 0))
    expect(updatedCard.nextReview.getTime()).toBeGreaterThan(now.getTime());
  });

  it('should update card properties correctly for quality 4 (good)', () => {
    const updatedCard = updateSpacedRepetition(card, 4);

    expect(updatedCard.lastReview).toEqual(now);
    expect(updatedCard.repetitions).toBe(1);
    expect(updatedCard.interval).toBe(1); // First repetition, interval is 1
    expect(updatedCard.easiness).toBeCloseTo(2.5); // 2.5 + (0.1 - (1) * (0.08 + 0.02))
    expect(updatedCard.nextReview.getTime()).toBeGreaterThan(now.getTime());
  });

  it('should update card properties correctly for quality 3 (hard)', () => {
    const updatedCard = updateSpacedRepetition(card, 3);

    expect(updatedCard.lastReview).toEqual(now);
    expect(updatedCard.repetitions).toBe(1);
    expect(updatedCard.interval).toBe(1); // First repetition, interval is 1
    expect(updatedCard.easiness).toBeCloseTo(2.36); // 2.5 + (0.1 - (2) * (0.08 + 0.02*2))
    expect(updatedCard.nextReview.getTime()).toBeGreaterThan(now.getTime());
  });

  it('should reset repetitions and interval for quality < 3', () => {
    card.repetitions = 5;
    card.interval = 10;
    card.easiness = 2.0;

    const updatedCard = updateSpacedRepetition(card, 2);

    expect(updatedCard.lastReview).toEqual(now);
    expect(updatedCard.repetitions).toBe(0); // Reset
    expect(updatedCard.interval).toBe(1); // Reset
    expect(updatedCard.easiness).toBeCloseTo(1.68); // 2.0 + (0.1 - (3) * (0.08 + 0.02*3))
    expect(updatedCard.nextReview.getTime()).toBeGreaterThan(now.getTime());
  });

  it('should set interval to 6 for second repetition with quality >= 3', () => {
    card.repetitions = 1;
    card.interval = 1;
    const updatedCard = updateSpacedRepetition(card, 5);

    expect(updatedCard.repetitions).toBe(2);
    expect(updatedCard.interval).toBe(6);
  });

  it('should calculate interval based on easiness for repetitions > 2 with quality >= 3', () => {
    card.repetitions = 2;
    card.interval = 6;
    card.easiness = 2.5;
    const updatedCard = updateSpacedRepetition(card, 5);

    expect(updatedCard.repetitions).toBe(3);
    expect(updatedCard.interval).toBe(Math.ceil(6 * 2.5)); // 15
  });

  it('should not let easiness factor drop below 1.3', () => {
    card.easiness = 1.3;
    const updatedCard = updateSpacedRepetition(card, 0); // Lowest quality

    expect(updatedCard.easiness).toBe(1.3);
  });
});