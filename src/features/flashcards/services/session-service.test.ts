import { describe, it, expect, vi, beforeEach } from 'vitest';
import { recordStudySession } from './session-service';
import { StudySessionRecord } from '../domain';

describe('recordStudySession', () => {
  const now = new Date('2025-01-01T12:00:00.000Z');

  beforeEach(() => {
    vi.setSystemTime(now);
  });

  it('should create a new session record with a unique ID and correct data', () => {
    const sessionData: Omit<StudySessionRecord, 'id'> = {
      startTime: new Date(now.getTime() - 30 * 60 * 1000),
      endTime: now,
      cardsStudied: 10,
      correctAnswers: 8,
      incorrectAnswers: 2,
      averageDifficulty: 2.5,
      sessionType: 'due',
      quitEarly: false
    };

    const newSession = recordStudySession(sessionData);

    expect(newSession).toHaveProperty('id');
    expect(typeof newSession.id).toBe('string');
    expect(newSession.id).toBe(now.getTime().toString()); // ID should be based on Date.now()
    expect(newSession.startTime).toEqual(sessionData.startTime);
    expect(newSession.endTime).toEqual(sessionData.endTime);
    expect(newSession.cardsStudied).toBe(sessionData.cardsStudied);
    expect(newSession.correctAnswers).toBe(sessionData.correctAnswers);
    expect(newSession.incorrectAnswers).toBe(sessionData.incorrectAnswers);
    expect(newSession.averageDifficulty).toBe(sessionData.averageDifficulty);
    expect(newSession.sessionType).toBe(sessionData.sessionType);
    expect(newSession.quitEarly).toBe(sessionData.quitEarly);
  });

  it('should handle optional endTime property', () => {
    const sessionData: Omit<StudySessionRecord, 'id'> = {
      startTime: new Date(now.getTime() - 30 * 60 * 1000),
      cardsStudied: 5,
      correctAnswers: 3,
      incorrectAnswers: 2,
      averageDifficulty: 2.0,
      sessionType: 'custom',
      quitEarly: true
    };

    const newSession = recordStudySession(sessionData);

    expect(newSession).toHaveProperty('id');
    expect(newSession.endTime).toBeUndefined();
  });
});
