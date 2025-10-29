import { Flashcard, StudySessionRecord, LearningStreak, Achievement } from '../domain';

export const initializeAchievements = (): Achievement[] => {
  return [
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
};

export const checkAchievements = (
  achievements: Achievement[],
  cards: Flashcard[],
  sessionHistory: StudySessionRecord[],
  learningStreak: LearningStreak,
  currentSession: StudySessionRecord
): Achievement[] => {
  const updatedAchievements = [...achievements];

  // Helper to update achievement progress and unlock
  const updateAchievement = (id: string, currentProgress: number, condition: boolean) => {
    const achievement = updatedAchievements.find(a => a.id === id);
    if (achievement && !achievement.unlockedAt) {
      achievement.progress.current = currentProgress;
      if (condition) {
        achievement.unlockedAt = new Date();
      }
    }
  };

  // Check first card achievement
  updateAchievement('first_card', cards.length, cards.length >= 1);

  // Check cards created achievement
  updateAchievement('cards_10', cards.length, cards.length >= 10);

  // Check sessions completed achievement
  const completedSessions = sessionHistory.filter(s => !s.quitEarly).length;
  updateAchievement('sessions_10', completedSessions, completedSessions >= 10);

  // Check reviews achievement
  const totalReviews = cards.reduce((sum, card) => sum + card.repetitions, 0);
  updateAchievement('reviews_100', totalReviews, totalReviews >= 100);

  // Check first session achievement
  updateAchievement('first_session', 1, sessionHistory.length > 0);

  // Check streak achievements
  updateAchievement('streak_3', learningStreak.currentStreak, learningStreak.currentStreak >= 3);
  updateAchievement('streak_7', learningStreak.currentStreak, learningStreak.currentStreak >= 7);

  // Check accuracy achievement
  if (currentSession.cardsStudied > 0) {
    const accuracy = (currentSession.correctAnswers / currentSession.cardsStudied) * 100;
    updateAchievement('accuracy_90', Math.floor(accuracy), accuracy >= 90);
  }

  return updatedAchievements;
};
