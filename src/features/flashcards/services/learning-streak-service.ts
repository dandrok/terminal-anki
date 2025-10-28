import { LearningStreak } from '../domain';

export const updateLearningStreak = (
  learningStreak: LearningStreak,
  sessionDate: Date
): LearningStreak => {
  const updatedStreak = { ...learningStreak };
  const today = new Date();
  const sessionDateOnly = new Date(
    Date.UTC(sessionDate.getFullYear(), sessionDate.getMonth(), sessionDate.getDate())
  );
  const todayDateOnly = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));

  const yesterdayDateOnly = new Date(todayDateOnly);
  yesterdayDateOnly.setUTCDate(yesterdayDateOnly.getUTCDate() - 1); // Use setUTCDate

  const dateStr = sessionDateOnly.toISOString().split('T')[0];

  if (!updatedStreak.studyDates.includes(dateStr)) {
    updatedStreak.studyDates.push(dateStr);
    updatedStreak.studyDates.sort();
  }

  // Calculate current streak
  if (
    sessionDateOnly.getTime() === todayDateOnly.getTime() ||
    sessionDateOnly.getTime() === yesterdayDateOnly.getTime()
  ) {
    // Check if this continues the streak
    if (updatedStreak.lastStudyDate) {
      const lastStudyDateOnly = new Date(
        updatedStreak.lastStudyDate.getFullYear(),
        updatedStreak.lastStudyDate.getMonth(),
        updatedStreak.lastStudyDate.getDate()
      );
      const daysDiff = Math.floor(
        (sessionDateOnly.getTime() - lastStudyDateOnly.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysDiff === 1) {
        updatedStreak.currentStreak++;
      } else if (daysDiff > 1) {
        updatedStreak.currentStreak = 1;
      }
    } else {
      updatedStreak.currentStreak = 1;
    }

    updatedStreak.lastStudyDate = sessionDateOnly;
    updatedStreak.longestStreak = Math.max(
      updatedStreak.longestStreak,
      updatedStreak.currentStreak
    );
  }

  return updatedStreak;
};
