/**
 * Date manipulation utilities for learning sessions and streaks
 */

export const toDateString = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

export const toStartOfDay = (date: Date): Date => {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
};

export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export const subDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
};

export const addMinutes = (date: Date, minutes: number): Date => {
  return new Date(date.getTime() + minutes * 60 * 1000);
};

export const daysDifference = (date1: Date, date2: Date): number => {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.round(Math.abs((date1.getTime() - date2.getTime()) / oneDay));
};

export const isToday = (date: Date): boolean => {
  const today = toStartOfDay(new Date());
  const targetDate = toStartOfDay(date);
  return today.getTime() === targetDate.getTime();
};

export const isYesterday = (date: Date): boolean => {
  const yesterday = toStartOfDay(addDays(new Date(), -1));
  const targetDate = toStartOfDay(date);
  return yesterday.getTime() === targetDate.getTime();
};

export const isThisWeek = (date: Date): boolean => {
  const now = new Date();
  const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
  const endOfWeek = addDays(startOfWeek, 6);
  return date >= startOfWeek && date <= endOfWeek;
};

export const isOverdue = (date: Date): boolean => {
  return date <= new Date();
};

export const getWeekRange = (date: Date): { start: Date; end: Date } => {
  const start = new Date(date);
  const day = start.getDay();
  const diff = start.getDate() - day;
  start.setDate(diff);
  start.setHours(0, 0, 0, 0);

  const end = addDays(start, 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
};

export const getLastFourWeeks = (): Array<{ start: Date; end: Date; label: string }> => {
  const now = new Date();
  const weeks = [];

  for (let i = 3; i >= 0; i--) {
    const weekStart = addDays(now, -(i * 7 + 6));
    const weekEnd = addDays(now, -(i * 7));
    const weekRange = getWeekRange(weekStart);
    weeks.push({
      ...weekRange,
      label: `Week ${4 - i}`
    });
  }

  return weeks;
};

export const calculateStudyStreak = (
  studyDates: string[]
): { current: number; longest: number } => {
  if (studyDates.length === 0) {
    return { current: 0, longest: 0 };
  }

  const sortedDates = [...studyDates].sort();
  const today = toDateString(new Date());
  const yesterday = toDateString(addDays(new Date(), -1));

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;

  // Check if we studied today or yesterday
  const lastStudyDate = sortedDates[sortedDates.length - 1];
  if (lastStudyDate === today || lastStudyDate === yesterday) {
    currentStreak = 1;
    tempStreak = 1;

    // Work backwards from the most recent study date
    for (let i = sortedDates.length - 2; i >= 0; i--) {
      const currentDate = new Date(sortedDates[i + 1]);
      const previousDate = new Date(sortedDates[i]);
      const daysDiff = daysDifference(currentDate, previousDate);

      if (daysDiff === 1) {
        tempStreak++;
      } else {
        break;
      }
    }

    currentStreak = tempStreak;
  }

  // Calculate longest streak
  tempStreak = 1;
  for (let i = 1; i < sortedDates.length; i++) {
    const currentDate = new Date(sortedDates[i]);
    const previousDate = new Date(sortedDates[i - 1]);
    const daysDiff = daysDifference(currentDate, previousDate);

    if (daysDiff === 1) {
      tempStreak++;
    } else {
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 1;
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak);

  return { current: currentStreak, longest: longestStreak };
};
