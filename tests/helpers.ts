import { initialSchedulingState } from '../src/core/sm2.js';
import type { Flashcard, StudySessionRecord } from '../src/types/index.js';

let counter = 0;

export function makeCard(overrides: Partial<Flashcard> = {}): Flashcard {
  counter++;
  const createdAt = overrides.createdAt ?? new Date(2026, 0, 1);
  return {
    id: `card-${counter}`,
    front: `front-${counter}`,
    back: `back-${counter}`,
    tags: [],
    ...initialSchedulingState(createdAt),
    createdAt,
    ...overrides
  };
}

export function makeSession(overrides: Partial<StudySessionRecord> = {}): StudySessionRecord {
  const startTime = overrides.startTime ?? new Date(2026, 7, 20, 10, 0);
  const cardsStudied = overrides.cardsStudied ?? 10;
  const correctAnswers = overrides.correctAnswers ?? 8;
  return {
    id: `session-${counter++}`,
    startTime,
    endTime: new Date(startTime.getTime() + 10 * 60 * 1000),
    cardsStudied,
    correctAnswers,
    incorrectAnswers: cardsStudied - correctAnswers,
    averageDifficulty: 2,
    sessionType: 'due',
    quitEarly: false,
    ...overrides
  };
}
