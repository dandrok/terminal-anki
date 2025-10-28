import {
  IStatisticsService,
  IDataRepository,
  ISpacedRepetitionService
} from '../../../shared/interfaces/services.js';
import { Result, Ok, Err } from '../../../shared/utils/result-type.js';

/**
 * Statistics Service Implementation with Dependency Injection
 */
export class StatisticsService implements IStatisticsService {
  readonly name = 'StatisticsService';
  readonly version = '1.0.0';

  constructor(
    private dataRepository: IDataRepository,
    private spacedRepetitionService: ISpacedRepetitionService
  ) {}

  /**
   * Get basic statistics about cards
   */
  async getBasicStats(): Promise<{
    totalCards: number;
    dueToday: number;
    newCards: number;
    learningCards: number;
    youngCards: number;
    matureCards: number;
  }> {
    try {
      const data = await this.dataRepository.loadData();
      const cards = data.cards;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const stats = {
        totalCards: cards.length,
        dueToday: 0,
        newCards: 0,
        learningCards: 0,
        youngCards: 0,
        matureCards: 0
      };

      for (const card of cards) {
        // Check if due today
        if (this.spacedRepetitionService.isCardDue(card, today)) {
          stats.dueToday++;
        }

        // Count by difficulty
        const difficulty = this.spacedRepetitionService.getCardDifficulty(card);
        stats[
          difficulty === 'new'
            ? 'newCards'
            : difficulty === 'learning'
              ? 'learningCards'
              : difficulty === 'young'
                ? 'youngCards'
                : 'matureCards'
        ]++;
      }

      return stats;
    } catch (error) {
      // Return default stats on error
      return {
        totalCards: 0,
        dueToday: 0,
        newCards: 0,
        learningCards: 0,
        youngCards: 0,
        matureCards: 0
      };
    }
  }

  /**
   * Get extended statistics
   */
  async getExtendedStats(): Promise<{
    totalReviews: number;
    averageEasiness: number;
    totalStudyTime: number;
    accuracyRate: number;
    streakDays: number;
  }> {
    try {
      const data = await this.dataRepository.loadData();
      const { cards, sessionHistory, learningStreak } = data;

      // Calculate total reviews
      const totalReviews = cards.reduce((sum, card) => sum + card.repetitions, 0);

      // Calculate average easiness
      const averageEasiness =
        cards.length > 0 ? cards.reduce((sum, card) => sum + card.easiness, 0) / cards.length : 2.5;

      // Calculate total study time (estimated from sessions)
      const totalStudyTime = sessionHistory.reduce(
        (sum, session) => sum + (session.duration || 0),
        0
      );

      // Calculate accuracy rate from session history
      const totalCardsStudied = sessionHistory.reduce(
        (sum, session) => sum + session.cardsStudied,
        0
      );
      const totalCorrect = sessionHistory.reduce((sum, session) => sum + session.correctAnswers, 0);
      const accuracyRate = totalCardsStudied > 0 ? (totalCorrect / totalCardsStudied) * 100 : 0;

      return {
        totalReviews,
        averageEasiness: Math.round(averageEasiness * 100) / 100,
        totalStudyTime,
        accuracyRate: Math.round(accuracyRate * 10) / 10,
        streakDays: learningStreak.currentStreak
      };
    } catch (error) {
      // Return default stats on error
      return {
        totalReviews: 0,
        averageEasiness: 2.5,
        totalStudyTime: 0,
        accuracyRate: 0,
        streakDays: 0
      };
    }
  }

  /**
   * Get tag distribution
   */
  async getTagDistribution(): Promise<Array<{
    tag: string;
    count: number;
    percentage: number;
  }>> {
    try {
      const data = await this.dataRepository.loadData();
      const tagCounts: Record<string, number> = {};
      let totalTags = 0;

      for (const card of data.cards) {
        for (const tag of card.tags) {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
          totalTags++;
        }
      }

      if (totalTags === 0) {
        return [];
      }

      return Object.entries(tagCounts).map(([tag, count]) => ({
        tag,
        count,
        percentage: (count / totalTags) * 100
      }));
    } catch (error) {
      return [];
    }
  }

  /**
   * Get progress over time
   */
  async getProgressOverTime(days: number): Promise<Array<{
    date: string;
    cardsStudied: number;
    accuracy: number;
  }>> {
    try {
      const data = await this.dataRepository.loadData();
      const { sessionHistory } = data;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      cutoffDate.setHours(0, 0, 0, 0);

      // Group sessions by date
      const dailyStats: Record<string, { cardsStudied: number; correct: number }> = {};

      for (const session of sessionHistory) {
        const sessionDate = new Date(session.startTime);
        if (sessionDate >= cutoffDate) {
          const dateKey = sessionDate.toISOString().split('T')[0];

          if (!dailyStats[dateKey]) {
            dailyStats[dateKey] = { cardsStudied: 0, correct: 0 };
          }

          dailyStats[dateKey].cardsStudied += session.cardsStudied;
          dailyStats[dateKey].correct += session.correctAnswers;
        }
      }

      // Convert to array format
      const progress = Object.entries(dailyStats).map(([date, stats]) => ({
        date,
        cardsStudied: stats.cardsStudied,
        accuracy:
          stats.cardsStudied > 0 ? Math.round((stats.correct / stats.cardsStudied) * 100) : 0
      }));

      // Sort by date
      return progress.sort((a, b) => a.date.localeCompare(b.date));
    } catch (error) {
      return [];
    }
  }
}
