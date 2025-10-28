import {
  IAchievementService,
  IFlashcardService,
  ISessionService
} from '../../../shared/interfaces/services.js';
import { Achievement, StudySessionRecord } from '../domain/index.js';

/**
 * Achievement Service Implementation with Dependency Injection
 */
export class AchievementService implements IAchievementService {
  readonly name = 'AchievementService';
  readonly version = '1.0.0';

  private achievements: Map<string, Achievement> = new Map();

  constructor(
    private flashcardService: IFlashcardService,
    private sessionService: ISessionService
  ) {
    this.initializeAchievements();
  }

  /**
   * Check for new achievements based on session data and statistics
   */
  checkAchievements(sessionData: StudySessionRecord | null, stats: any): Achievement[] {
    const newAchievements: Achievement[] = [];

    for (const [id, achievement] of this.achievements) {
      if (achievement.unlockedAt) {
        continue; // Already unlocked
      }

      if (this.checkAchievementCondition(achievement, sessionData, stats)) {
        const updatedAchievement = {
          ...achievement,
          unlockedAt: new Date()
        };

        this.achievements.set(id, updatedAchievement);
        newAchievements.push(updatedAchievement);
      }
    }

    return newAchievements;
  }

  /**
   * Update an existing achievement
   */
  updateAchievement(id: string, achievement: Achievement): void {
    this.achievements.set(id, achievement);
  }

  /**
   * Unlock an achievement
   */
  unlockAchievement(id: string): void {
    const achievement = this.achievements.get(id);
    if (!achievement || achievement.unlockedAt) {
      return;
    }

    const updatedAchievement = {
      ...achievement,
      unlockedAt: new Date()
    };

    this.achievements.set(id, updatedAchievement);
  }

  /**
   * Get achievement by ID
   */
  getAchievementById(id: string): Achievement | null {
    return this.achievements.get(id) || null;
  }

  /**
   * Get all achievements
   */
  getAchievements(): Achievement[] {
    return Array.from(this.achievements.values());
  }

  /**
   * Get unlocked achievements
   */
  getUnlockedAchievements(): Achievement[] {
    return this.getAchievements().filter(achievement => achievement.unlockedAt);
  }

  /**
   * Get total number of achievements
   */
  getTotalAchievements(): number {
    return this.achievements.size;
  }

  /**
   * Initialize default achievements
   */
  private initializeAchievements(): void {
    const defaultAchievements: Achievement[] = [
      // Card achievements
      {
        id: 'first_card',
        name: 'First Steps',
        description: 'Create your first flashcard',
        icon: '🎯',
        category: 'cards',
        progress: {
          current: 0,
          required: 1,
          description: 'Create your first flashcard'
        },
        unlockedAt: undefined
      },
      {
        id: 'card_collector',
        name: 'Card Collector',
        description: 'Create 50 flashcards',
        icon: '📚',
        category: 'cards',
        progress: {
          current: 0,
          required: 50,
          description: 'Create 50 flashcards'
        },
        unlockedAt: undefined
      },
      {
        id: 'card_master',
        name: 'Card Master',
        description: 'Create 200 flashcards',
        icon: '🏆',
        category: 'cards',
        progress: {
          current: 0,
          required: 200,
          description: 'Create 200 flashcards'
        },
        unlockedAt: undefined
      },

      // Session achievements
      {
        id: 'first_session',
        name: 'Getting Started',
        description: 'Complete your first study session',
        icon: '🚀',
        category: 'sessions',
        progress: {
          current: 0,
          required: 1,
          description: 'Complete your first study session'
        },
        unlockedAt: undefined
      },
      {
        id: 'consistent_learner',
        name: 'Consistent Learner',
        description: 'Complete 10 study sessions',
        icon: '📈',
        category: 'sessions',
        progress: {
          current: 0,
          required: 10,
          description: 'Complete 10 study sessions'
        },
        unlockedAt: undefined
      },
      {
        id: 'study_warrior',
        name: 'Study Warrior',
        description: 'Complete 50 study sessions',
        icon: '⚔️',
        category: 'sessions',
        progress: {
          current: 0,
          required: 50,
          description: 'Complete 50 study sessions'
        },
        unlockedAt: undefined
      },

      // Streak achievements
      {
        id: 'streak_beginner',
        name: 'On Fire',
        description: 'Maintain a 3-day study streak',
        icon: '🔥',
        category: 'streaks',
        progress: {
          current: 0,
          required: 3,
          description: 'Maintain a 3-day study streak'
        },
        unlockedAt: undefined
      },
      {
        id: 'streak_intermediate',
        name: 'Dedicated Learner',
        description: 'Maintain a 7-day study streak',
        icon: '💪',
        category: 'streaks',
        progress: {
          current: 0,
          required: 7,
          description: 'Maintain a 7-day study streak'
        },
        unlockedAt: undefined
      },
      {
        id: 'streak_expert',
        name: 'Learning Machine',
        description: 'Maintain a 30-day study streak',
        icon: '🤖',
        category: 'streaks',
        progress: {
          current: 0,
          required: 30,
          description: 'Maintain a 30-day study streak'
        },
        unlockedAt: undefined
      },
      {
        id: 'streak_master',
        name: 'Unstoppable',
        description: 'Maintain a 100-day study streak',
        icon: '🌟',
        category: 'streaks',
        progress: {
          current: 0,
          required: 100,
          description: 'Maintain a 100-day study streak'
        },
        unlockedAt: undefined
      },

      // Mastery achievements
      {
        id: 'accuracy_expert',
        name: 'Perfect Score',
        description: 'Achieve 100% accuracy in a session',
        icon: '🎯',
        category: 'mastery',
        progress: {
          current: 0,
          required: 1,
          description: 'Achieve 100% accuracy in a session'
        },
        unlockedAt: undefined
      },
      {
        id: 'mature_cards',
        name: 'Seasoned Learner',
        description: 'Have 20 mature cards',
        icon: '🌱',
        category: 'mastery',
        progress: {
          current: 0,
          required: 20,
          description: 'Have 20 mature cards'
        },
        unlockedAt: undefined
      }
    ];

    this.achievements.clear();
    for (const achievement of defaultAchievements) {
      this.achievements.set(achievement.id, achievement);
    }
  }

  /**
   * Check if an achievement condition is met
   */
  private checkAchievementCondition(
    achievement: Achievement,
    sessionData: StudySessionRecord | null,
    stats: any
  ): boolean {
    switch (achievement.id) {
      case 'first_card':
        return stats.total >= 1;

      case 'card_collector':
        return stats.total >= 50;

      case 'card_master':
        return stats.total >= 200;

      case 'first_session':
        return (sessionData && (sessionData.cardsStudied ?? 0) > 0) || false;

      case 'consistent_learner':
        return this.getTotalSessionsCompleted() >= 10;

      case 'study_warrior':
        return this.getTotalSessionsCompleted() >= 50;

      case 'streak_beginner':
        return stats.currentStreak >= 3;

      case 'streak_intermediate':
        return stats.currentStreak >= 7;

      case 'streak_expert':
        return stats.currentStreak >= 30;

      case 'streak_master':
        return stats.currentStreak >= 100;

      case 'accuracy_expert':
        return (
          (sessionData &&
            (sessionData.cardsStudied ?? 0) > 0 &&
            (sessionData.correctAnswers ?? 0) === (sessionData.cardsStudied ?? 0)) ||
          false
        );

      case 'mature_cards':
        return stats.mature >= 20;

      default:
        return false;
    }
  }

  /**
   * Get total number of completed sessions
   */
  private getTotalSessionsCompleted(): number {
    const allSessions = this.sessionService.getSessionHistory();
    return allSessions.filter((session: any) => session.duration > 0).length;
  }
}