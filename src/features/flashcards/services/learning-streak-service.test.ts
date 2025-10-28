import { describe, it, expect, beforeEach, vi } from 'vitest';
import { updateLearningStreak } from './learning-streak-service';
import { LearningStreak } from '../domain';
import { toDateString } from '../../../shared/utils/date-utils'; // Added import

describe('updateLearningStreak', () => {
  let learningStreak: LearningStreak;
  const today = new Date('2025-01-03T12:00:00.000Z'); // Friday

  beforeEach(() => {
    vi.setSystemTime(today);
    learningStreak = {
      currentStreak: 0,
      longestStreak: 0,
      lastStudyDate: null,
      studyDates: [],
    };
  });

  it('should start a new streak if no previous study date', () => {
    const sessionDate = new Date('2025-01-03T10:00:00.000Z'); // Today
    const updatedStreak = updateLearningStreak(learningStreak, sessionDate);

    expect(updatedStreak.currentStreak).toBe(1);
    expect(updatedStreak.longestStreak).toBe(1);
    expect(toDateString(updatedStreak.lastStudyDate!)).toBe('2025-01-03');
    expect(updatedStreak.studyDates).toEqual(['2025-01-03']);
  });

  it('should continue streak if studied on consecutive day (yesterday)', () => {
    learningStreak.currentStreak = 1;
    learningStreak.longestStreak = 1;
    learningStreak.lastStudyDate = new Date('2025-01-02T10:00:00.000Z'); // Yesterday
    learningStreak.studyDates = ['2025-01-02'];

    const sessionDate = new Date('2025-01-03T10:00:00.000Z'); // Today
    const updatedStreak = updateLearningStreak(learningStreak, sessionDate);

    expect(updatedStreak.currentStreak).toBe(2);
    expect(updatedStreak.longestStreak).toBe(2);
    expect(toDateString(updatedStreak.lastStudyDate!)).toBe('2025-01-03'); // Corrected
    expect(updatedStreak.studyDates).toEqual(['2025-01-02', '2025-01-03']);
  });

  it('should continue streak if studied on the same day (today)', () => {
    learningStreak.currentStreak = 1;
    learningStreak.longestStreak = 1;
    learningStreak.lastStudyDate = new Date('2025-01-03T09:00:00.000Z'); // Earlier today
    learningStreak.studyDates = ['2025-01-03'];

    const sessionDate = new Date('2025-01-03T10:00:00.000Z'); // Later today
    const updatedStreak = updateLearningStreak(learningStreak, sessionDate);

    expect(updatedStreak.currentStreak).toBe(1);
    expect(updatedStreak.longestStreak).toBe(1);
    expect(toDateString(updatedStreak.lastStudyDate!)).toBe('2025-01-03'); // Corrected
    expect(updatedStreak.studyDates).toEqual(['2025-01-03']);
  });

  it('should reset streak if there is a gap of more than one day', () => {
    learningStreak.currentStreak = 2;
    learningStreak.longestStreak = 2;
    learningStreak.lastStudyDate = new Date('2025-01-01T10:00:00.000Z'); // Two days ago
    learningStreak.studyDates = ['2025-01-01'];

    const sessionDate = new Date('2025-01-03T10:00:00.000Z'); // Today
    const updatedStreak = updateLearningStreak(learningStreak, sessionDate);

    expect(updatedStreak.currentStreak).toBe(1);
    expect(updatedStreak.longestStreak).toBe(2);
    expect(toDateString(updatedStreak.lastStudyDate!)).toBe('2025-01-03'); // Corrected
    expect(updatedStreak.studyDates).toEqual(['2025-01-01', '2025-01-03']);
  });

  it('should update longest streak if current streak surpasses it', () => {
    learningStreak.currentStreak = 5;
    learningStreak.longestStreak = 4;
    learningStreak.lastStudyDate = new Date('2025-01-02T10:00:00.000Z'); // Yesterday
    learningStreak.studyDates = ['2025-01-02'];

    const sessionDate = new Date('2025-01-03T10:00:00.000Z'); // Today
    const updatedStreak = updateLearningStreak(learningStreak, sessionDate);

    expect(updatedStreak.currentStreak).toBe(6);
    expect(updatedStreak.longestStreak).toBe(6);
  });

  it('should add new study date to studyDates array', () => {
    learningStreak.studyDates = ['2025-01-01', '2025-01-02'];
    const sessionDate = new Date('2025-01-03T10:00:00.000Z');
    const updatedStreak = updateLearningStreak(learningStreak, sessionDate);
    expect(updatedStreak.studyDates).toEqual(['2025-01-01', '2025-01-02', '2025-01-03']);
  });

  it('should not add duplicate study date', () => {
    learningStreak.studyDates = ['2025-01-03'];
    const sessionDate = new Date('2025-01-03T10:00:00.000Z');
    const updatedStreak = updateLearningStreak(learningStreak, sessionDate);
    expect(updatedStreak.studyDates).toEqual(['2025-01-03']);
  });
});