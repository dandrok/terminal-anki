import { ILearningStreakService, IDataRepository } from '../../../shared/interfaces/services.js';
import { LearningStreak } from '../domain';

/**
 * Learning Streak Service Implementation with Dependency Injection
 */
export class LearningStreakService implements ILearningStreakService {
  readonly name = 'LearningStreakService';
  readonly version = '1.0.0';

  constructor(private dataRepository: IDataRepository) {}

  /**
   * Update learning streak based on study date
   */
  async updateStreak(studyDate: Date): Promise<LearningStreak> {
    try {
      const data = await this.dataRepository.loadData();
      const { learningStreak } = data;
      const updatedStreak = this.calculateUpdatedStreak(
        learningStreak,
        studyDate
      );

      // Save updated streak
      await this.dataRepository.saveData({
        ...data,
        learningStreak: updatedStreak
      });

      return updatedStreak;
    } catch (error) {
      console.error('Failed to update learning streak:', error);
      // Return the most recent streak or a default value
      const data = await this.dataRepository.loadData().catch(() => null);
      return data ? data.learningStreak : this.getDefaultStreak();
    }
  }

  /**
   * Get current streak
   */
  async getCurrentStreak(): Promise<number> {
    try {
      const data = await this.dataRepository.loadData();
      return data.learningStreak.currentStreak;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get longest streak
   */
  async getLongestStreak(): Promise<number> {
    try {
      const data = await this.dataRepository.loadData();
      return data.learningStreak.longestStreak;
    } catch (error) {
      return 0;
    }
  }

  async getLastStudyDate(): Promise<Date | null> {
    try {
      const data = await this.dataRepository.loadData();
      return data.learningStreak.lastStudyDate ? new Date(data.learningStreak.lastStudyDate) : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get all study dates
   */
  async getStudyDates(): Promise<Date[]> {
    try {
      const data = await this.dataRepository.loadData();
      return data.learningStreak.studyDates.map((date: string) => new Date(date));
    } catch (error) {
      return [];
    }
  }

  /**
   * Calculate streak information from study dates
   */
  calculateStreak(studyDates: string[]): {
    current: number;
    longest: number;
  } {
    if (studyDates.length === 0) {
      return { current: 0, longest: 0 };
    }

    // Sort dates and remove duplicates
    const sortedDates = [...new Set(studyDates)].sort();
    const today = new Date().toISOString().split('T')[0];

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    // Find current streak
    const todayIndex = sortedDates.indexOf(today);
    if (todayIndex !== -1) {
      // Studied today
      currentStreak = this.countConsecutiveDays(sortedDates, todayIndex, -1);
    } else {
      // Check if studied yesterday
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      const yesterdayIndex = sortedDates.indexOf(yesterdayStr);

      if (yesterdayIndex !== -1) {
        // Studied yesterday but not today - streak is still active
        currentStreak = this.countConsecutiveDays(sortedDates, yesterdayIndex, -1);
      } else {
        // Haven't studied in 2+ days
        currentStreak = 0;
      }
    }

    // Find longest streak
    for (let i = 0; i < sortedDates.length; i++) {
      tempStreak = this.countConsecutiveDays(sortedDates, i, 1);
      longestStreak = Math.max(longestStreak, tempStreak);
    }

    return { current: currentStreak, longest: longestStreak };
  }

  /**
   * Check if streak is active (studied today or yesterday)
   */
  async isStreakActive(): Promise<boolean> {
    try {
      const data = await this.dataRepository.loadData();
      const { studyDates } = data.learningStreak;
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

            return studyDates.some((date: string) => {
                                       const dateStr = new Date(date).toISOString().split('T')[0];
                                       return dateStr === today || dateStr === yesterdayStr;
                                     });    } catch (error) {
      return false;
    }
  }

  async hasStreakToday(): Promise<boolean> {
    try {
      const data = await this.dataRepository.loadData();
      const { studyDates } = data.learningStreak;
      const today = new Date().toISOString().split('T')[0];

      return studyDates.some((date: string) => new Date(date).toISOString().split('T')[0] === today);
    } catch (error) {
      return false;
    }
  }

  /**
   * Get streak visualization
   */
  async getStreakVisualization(days: number = 30): Promise<Array<{
    date: string;
    studied: boolean;
    isToday: boolean;
  }>> {
    const visualization: Array<{ date: string; studied: boolean; isToday: boolean }> = [];
    const studyDates = await this.getStudyDates();
    const today = new Date().toISOString().split('T')[0];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      visualization.push({
        date: dateStr,
        studied: studyDates.map(d => d.toISOString().split('T')[0]).includes(dateStr),
        isToday: dateStr === today
      });
    }

    return visualization;
  }

  /**
   * Calculate updated streak based on new study date
   */
  private calculateUpdatedStreak(currentStreak: LearningStreak, studyDate: Date): LearningStreak {
    const dateStr = studyDate.toISOString().split('T')[0];
    const updatedStudyDates = [...new Set([...currentStreak.studyDates, dateStr])].sort();

    const streakInfo = this.calculateStreak(updatedStudyDates);

    return {
      currentStreak: streakInfo.current,
      longestStreak: Math.max(currentStreak.longestStreak, streakInfo.longest),
      lastStudyDate: studyDate,
      studyDates: updatedStudyDates
    };
  }

  /**
   * Count consecutive days from a starting index
   */
  private countConsecutiveDays(dates: string[], startIndex: number, direction: 1 | -1): number {
    let count = 1;
    let currentIndex = startIndex;

    while (currentIndex + direction >= 0 && currentIndex + direction < dates.length) {
      currentIndex += direction;
      const currentDate = new Date(dates[currentIndex]);
      const previousDate = new Date(dates[currentIndex - direction]);

      // Check if dates are consecutive
      const daysDiff = Math.abs(
        (currentDate.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysDiff === 1) {
        count++;
      } else {
        break;
      }
    }

    return count;
  }

  /**
   * Get default streak structure
   */
  private getDefaultStreak(): LearningStreak {
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastStudyDate: null,
      studyDates: []
    };
  }
}
