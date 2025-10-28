export interface LearningStreak {
  currentStreak: number;
  longestStreak: number;
  lastStudyDate: Date | null;
  studyDates: string[]; // YYYY-MM-DD format
}
