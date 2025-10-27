import {
  Flashcard,
  ReviewQuality,
  StudySessionRecord,
  LearningStreak,
  Achievement,
  ExtendedStats,
  CustomStudyFilters
} from './types';

export class FlashcardManager {
  private cards: Flashcard[] = [];
  private sessionHistory: StudySessionRecord[] = [];
  private learningStreak: LearningStreak = {
    currentStreak: 0,
    longestStreak: 0,
    lastStudyDate: null,
    studyDates: []
  };
  private achievements: Achievement[] = [];
  private dataFile = require('path').join(__dirname, '..', 'flashcards.json');

  constructor() {
    this.initializeAchievements();
    this.loadData();
  }

  private loadData(): void {
    try {
      const fs = require('fs');
      if (fs.existsSync(this.dataFile)) {
        const data = JSON.parse(fs.readFileSync(this.dataFile, 'utf-8'));

        // Load flashcards with tags support
        this.cards =
          data.cards?.map((card: any) => ({
            ...card,
            tags: card.tags || [], // Backward compatibility
            nextReview: new Date(card.nextReview),
            lastReview: card.lastReview ? new Date(card.lastReview) : null,
            createdAt: new Date(card.createdAt)
          })) || [];

        // Load session history
        this.sessionHistory =
          data.sessionHistory?.map((session: any) => ({
            ...session,
            startTime: new Date(session.startTime),
            endTime: session.endTime ? new Date(session.endTime) : undefined
          })) || [];

        // Load learning streak
        this.learningStreak = data.learningStreak || this.learningStreak;
        if (this.learningStreak.lastStudyDate) {
          this.learningStreak.lastStudyDate = new Date(this.learningStreak.lastStudyDate);
        }

        // Load achievements
        this.achievements = data.achievements || this.achievements;

        if (this.cards.length === 0) {
          this.createSampleCards();
        }
      } else {
        this.createSampleCards();
      }
    } catch (error) {
      console.error('Error loading data:', error);
      this.createSampleCards();
    }
  }

  private createSampleCards(): void {
    const sampleCards = [
      {
        front: 'Python',
        back: 'A high-level programming language',
        tags: ['programming', 'python']
      },
      {
        front: 'Algorithm',
        back: 'A step-by-step procedure for solving a problem',
        tags: ['computer-science', 'algorithms']
      },
      {
        front: 'Database',
        back: 'An organized collection of structured information',
        tags: ['database', 'storage']
      },
      { front: 'API', back: 'Application Programming Interface', tags: ['programming', 'web'] },
      {
        front: 'Git',
        back: 'A distributed version control system',
        tags: ['tools', 'version-control']
      }
    ];

    this.cards = sampleCards.map((card, index) => ({
      id: (index + 1).toString(),
      front: card.front,
      back: card.back,
      tags: card.tags,
      easiness: 2.5,
      interval: 1,
      repetitions: 0,
      nextReview: new Date(),
      lastReview: null,
      createdAt: new Date()
    }));

    this.saveData();
  }

  saveData(): void {
    try {
      const fs = require('fs');
      const data = {
        cards: this.cards,
        sessionHistory: this.sessionHistory,
        learningStreak: this.learningStreak,
        achievements: this.achievements
      };
      fs.writeFileSync(this.dataFile, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Error saving data:', error);
    }
  }

  // Backward compatibility
  saveCards(): void {
    this.saveData();
  }

  getAllCards(): Flashcard[] {
    return [...this.cards];
  }

  getDueCards(): Flashcard[] {
    const now = new Date();
    return this.cards.filter(card => card.nextReview <= now);
  }

  addCard(front: string, back: string, tags: string[] = []): Flashcard {
    const newCard: Flashcard = {
      id: (this.cards.length + 1).toString(),
      front,
      back,
      tags: tags.map(tag => tag.trim().toLowerCase()).filter(tag => tag.length > 0),
      easiness: 2.5,
      interval: 1,
      repetitions: 0,
      nextReview: new Date(),
      lastReview: null,
      createdAt: new Date()
    };

    this.cards.push(newCard);
    this.saveData();
    return newCard;
  }

  deleteCard(id: string): boolean {
    const index = this.cards.findIndex(card => card.id === id);
    if (index !== -1) {
      this.cards.splice(index, 1);
      this.saveData();
      return true;
    }
    return false;
  }

  searchCards(query: string): Flashcard[] {
    const lowerQuery = query.toLowerCase();
    return this.cards.filter(
      card =>
        card.front.toLowerCase().includes(lowerQuery) ||
        card.back.toLowerCase().includes(lowerQuery)
    );
  }

  updateSpacedRepetition(card: Flashcard, quality: ReviewQuality): void {
    const now = new Date();
    card.lastReview = now;
    card.repetitions += 1;

    // SM-2 Algorithm implementation
    if (quality >= 3) {
      if (card.repetitions === 1) {
        card.interval = 1;
      } else if (card.repetitions === 2) {
        card.interval = 6;
      } else {
        card.interval = Math.ceil(card.interval * card.easiness);
      }

      card.nextReview = new Date(now.getTime() + card.interval * 24 * 60 * 60 * 1000);
    } else {
      card.repetitions = 0;
      card.interval = 1;
      card.nextReview = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes
    }

    // Update easiness factor
    card.easiness = Math.max(
      1.3,
      card.easiness + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    );

    this.saveData();
  }

  // Initialize achievements system
  private initializeAchievements(): void {
    this.achievements = [
      {
        id: 'first_card',
        name: 'First Steps',
        description: 'Create your first flashcard',
        icon: '◎',
        category: 'cards',
        progress: { current: 0, required: 1, description: 'cards created' }
      },
      {
        id: 'first_session',
        name: 'Study Beginner',
        description: 'Complete your first study session',
        icon: '◉',
        category: 'sessions',
        progress: { current: 0, required: 1, description: 'sessions completed' }
      },
      {
        id: 'streak_3',
        name: '3-Day Streak',
        description: 'Study for 3 consecutive days',
        icon: '◈',
        category: 'streaks',
        progress: { current: 0, required: 3, description: 'day streak' }
      },
      {
        id: 'streak_7',
        name: 'Week Warrior',
        description: 'Study for 7 consecutive days',
        icon: '◊',
        category: 'streaks',
        progress: { current: 0, required: 7, description: 'day streak' }
      },
      {
        id: 'cards_10',
        name: 'Growing Collection',
        description: 'Create 10 flashcards',
        icon: '◐',
        category: 'cards',
        progress: { current: 0, required: 10, description: 'cards created' }
      },
      {
        id: 'reviews_100',
        name: 'Dedicated Learner',
        description: 'Complete 100 card reviews',
        icon: '◰',
        category: 'mastery',
        progress: { current: 0, required: 100, description: 'total reviews' }
      },
      {
        id: 'sessions_10',
        name: 'Study Regular',
        description: 'Complete 10 study sessions',
        icon: '★',
        category: 'sessions',
        progress: { current: 0, required: 10, description: 'sessions completed' }
      },
      {
        id: 'accuracy_90',
        name: 'Accuracy Master',
        description: 'Achieve 90% accuracy in a session',
        icon: '◎',
        category: 'mastery',
        progress: { current: 0, required: 90, description: 'session accuracy %' }
      }
    ];
  }

  getStats() {
    const totalCards = this.cards.length;
    const dueCards = this.getDueCards().length;
    const totalReviews = this.cards.reduce((sum, card) => sum + card.repetitions, 0);
    const averageEasiness = this.cards.reduce((sum, card) => sum + card.easiness, 0) / totalCards;

    const distribution = {
      new: 0,
      learning: 0,
      young: 0,
      mature: 0
    };

    this.cards.forEach(card => {
      if (card.interval <= 1) {
        distribution.new++;
      } else if (card.interval <= 7) {
        distribution.learning++;
      } else if (card.interval <= 30) {
        distribution.young++;
      } else {
        distribution.mature++;
      }
    });

    return {
      totalCards,
      dueCards,
      totalReviews,
      averageEasiness,
      distribution
    };
  }

  // New extended stats with v1.2.0 features
  getExtendedStats(): ExtendedStats {
    const basicStats = this.getStats();
    const totalStudyTime = this.sessionHistory.reduce((sum, session) => {
      if (session.endTime) {
        return sum + (session.endTime.getTime() - session.startTime.getTime()) / (1000 * 60);
      }
      return sum;
    }, 0);

    const completedSessions = this.sessionHistory.filter(session => !session.quitEarly);
    const averageSessionLength =
      completedSessions.length > 0 ? totalStudyTime / completedSessions.length : 0;

    // Tag distribution
    const tagDistribution: Record<string, number> = {};
    this.cards.forEach(card => {
      card.tags.forEach(tag => {
        tagDistribution[tag] = (tagDistribution[tag] || 0) + 1;
      });
    });

    // Weekly progress (last 4 weeks)
    const weeklyProgress = [];
    const now = new Date();
    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (i * 7 + 6));
      const weekEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i * 7);
      const weekStr = `Week ${4 - i}`;

      const weekSessions = this.sessionHistory.filter(
        session => session.startTime >= weekStart && session.startTime <= weekEnd
      );

      const cardsStudied = weekSessions.reduce((sum, session) => sum + session.cardsStudied, 0);
      const correctAnswers = weekSessions.reduce((sum, session) => sum + session.correctAnswers, 0);
      const totalAnswers = cardsStudied;
      const accuracy = totalAnswers > 0 ? (correctAnswers / totalAnswers) * 100 : 0;

      weeklyProgress.push({
        week: weekStr,
        cardsStudied,
        accuracy,
        sessionCount: weekSessions.length
      });
    }

    return {
      ...basicStats,
      learningStreak: this.learningStreak,
      totalStudyTime,
      sessionsCompleted: completedSessions.length,
      averageSessionLength,
      achievements: this.achievements,
      recentSessions: this.sessionHistory.slice(-10),
      tagDistribution,
      weeklyProgress
    };
  }

  // Get all available tags
  getAllTags(): string[] {
    const allTags = new Set<string>();
    this.cards.forEach(card => {
      card.tags.forEach(tag => allTags.add(tag));
    });
    return Array.from(allTags).sort();
  }

  // Custom study session filtering
  getFilteredCards(filters: CustomStudyFilters): Flashcard[] {
    let filteredCards = [...this.cards];

    // Filter by tags
    if (filters.tags && filters.tags.length > 0) {
      filteredCards = filteredCards.filter(card =>
        filters.tags!.some(tag => card.tags.includes(tag.toLowerCase()))
      );
    }

    // Filter by difficulty
    if (filters.difficulty) {
      filteredCards = filteredCards.filter(card => {
        switch (filters.difficulty) {
          case 'new':
            return card.interval <= 1;
          case 'learning':
            return card.interval > 1 && card.interval <= 7;
          case 'young':
            return card.interval > 7 && card.interval <= 30;
          case 'mature':
            return card.interval > 30;
          default:
            return true;
        }
      });
    }

    // Apply limit
    if (filters.limit && filters.limit > 0) {
      filteredCards = filteredCards.slice(0, filters.limit);
    }

    // Random order if requested
    if (filters.randomOrder) {
      filteredCards.sort(() => Math.random() - 0.5);
    }

    return filteredCards;
  }

  // Record a study session
  recordStudySession(sessionData: Omit<StudySessionRecord, 'id'>): StudySessionRecord {
    const session: StudySessionRecord = {
      ...sessionData,
      id: Date.now().toString()
    };

    this.sessionHistory.push(session);

    // Update learning streak
    this.updateLearningStreak(sessionData.startTime);

    // Check and update achievements
    this.checkAchievements(session);

    // Keep only last 100 sessions in history
    if (this.sessionHistory.length > 100) {
      this.sessionHistory = this.sessionHistory.slice(-100);
    }

    this.saveData();
    return session;
  }

  private updateLearningStreak(sessionDate: Date): void {
    const today = new Date();
    const sessionDateOnly = new Date(
      sessionDate.getFullYear(),
      sessionDate.getMonth(),
      sessionDate.getDate()
    );
    const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const yesterdayDateOnly = new Date(todayDateOnly);
    yesterdayDateOnly.setDate(yesterdayDateOnly.getDate() - 1);

    const dateStr = sessionDateOnly.toISOString().split('T')[0];

    if (!this.learningStreak.studyDates.includes(dateStr)) {
      this.learningStreak.studyDates.push(dateStr);
      this.learningStreak.studyDates.sort();
    }

    // Calculate current streak
    if (
      sessionDateOnly.getTime() === todayDateOnly.getTime() ||
      sessionDateOnly.getTime() === yesterdayDateOnly.getTime()
    ) {
      // Check if this continues the streak
      if (this.learningStreak.lastStudyDate) {
        const lastStudyDateOnly = new Date(
          this.learningStreak.lastStudyDate.getFullYear(),
          this.learningStreak.lastStudyDate.getMonth(),
          this.learningStreak.lastStudyDate.getDate()
        );
        const daysDiff = Math.floor(
          (sessionDateOnly.getTime() - lastStudyDateOnly.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysDiff === 1) {
          this.learningStreak.currentStreak++;
        } else if (daysDiff > 1) {
          this.learningStreak.currentStreak = 1;
        }
      } else {
        this.learningStreak.currentStreak = 1;
      }

      this.learningStreak.lastStudyDate = sessionDateOnly;
      this.learningStreak.longestStreak = Math.max(
        this.learningStreak.longestStreak,
        this.learningStreak.currentStreak
      );
    }
  }

  private checkAchievements(session: StudySessionRecord): void {
    // Check cards created achievement
    const totalCardsAchievement = this.achievements.find(a => a.id === 'cards_10');
    if (totalCardsAchievement && !totalCardsAchievement.unlockedAt) {
      totalCardsAchievement.progress.current = this.cards.length;
      if (this.cards.length >= 10) {
        totalCardsAchievement.unlockedAt = new Date();
      }
    }

    // Check sessions completed achievement
    const sessionsAchievement = this.achievements.find(a => a.id === 'sessions_10');
    const completedSessions = this.sessionHistory.filter(s => !s.quitEarly).length;
    if (sessionsAchievement && !sessionsAchievement.unlockedAt) {
      sessionsAchievement.progress.current = completedSessions;
      if (completedSessions >= 10) {
        sessionsAchievement.unlockedAt = new Date();
      }
    }

    // Check reviews achievement
    const reviewsAchievement = this.achievements.find(a => a.id === 'reviews_100');
    const totalReviews = this.cards.reduce((sum, card) => sum + card.repetitions, 0);
    if (reviewsAchievement && !reviewsAchievement.unlockedAt) {
      reviewsAchievement.progress.current = totalReviews;
      if (totalReviews >= 100) {
        reviewsAchievement.unlockedAt = new Date();
      }
    }

    // Check first session achievement
    const firstSessionAchievement = this.achievements.find(a => a.id === 'first_session');
    if (
      firstSessionAchievement &&
      !firstSessionAchievement.unlockedAt &&
      this.sessionHistory.length > 0
    ) {
      firstSessionAchievement.progress.current = 1;
      firstSessionAchievement.unlockedAt = new Date();
    }

    // Check streak achievements
    const streak3Achievement = this.achievements.find(a => a.id === 'streak_3');
    if (streak3Achievement && !streak3Achievement.unlockedAt) {
      streak3Achievement.progress.current = this.learningStreak.currentStreak;
      if (this.learningStreak.currentStreak >= 3) {
        streak3Achievement.unlockedAt = new Date();
      }
    }

    const streak7Achievement = this.achievements.find(a => a.id === 'streak_7');
    if (streak7Achievement && !streak7Achievement.unlockedAt) {
      streak7Achievement.progress.current = this.learningStreak.currentStreak;
      if (this.learningStreak.currentStreak >= 7) {
        streak7Achievement.unlockedAt = new Date();
      }
    }

    // Check accuracy achievement
    const accuracyAchievement = this.achievements.find(a => a.id === 'accuracy_90');
    if (accuracyAchievement && !accuracyAchievement.unlockedAt && session.cardsStudied > 0) {
      const accuracy = (session.correctAnswers / session.cardsStudied) * 100;
      if (accuracy >= 90) {
        accuracyAchievement.progress.current = Math.floor(accuracy);
        accuracyAchievement.unlockedAt = new Date();
      }
    }
  }

  // Update card tags
  updateCardTags(cardId: string, tags: string[]): boolean {
    const card = this.cards.find(c => c.id === cardId);
    if (!card) return false;

    card.tags = tags.map(tag => tag.trim().toLowerCase()).filter(tag => tag.length > 0);
    this.saveData();
    return true;
  }

  // Search cards by tag
  getCardsByTag(tag: string): Flashcard[] {
    return this.cards.filter(card => card.tags.includes(tag.toLowerCase()));
  }

  // Get cards by difficulty level
  getCardsByDifficulty(difficulty: 'new' | 'learning' | 'young' | 'mature'): Flashcard[] {
    return this.cards.filter(card => {
      switch (difficulty) {
        case 'new':
          return card.interval <= 1;
        case 'learning':
          return card.interval > 1 && card.interval <= 7;
        case 'young':
          return card.interval > 7 && card.interval <= 30;
        case 'mature':
          return card.interval > 30;
        default:
          return true;
      }
    });
  }
}
