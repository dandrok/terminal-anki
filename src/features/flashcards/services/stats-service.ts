import { Flashcard, CardStats, ExtendedStats, LearningStreak, StudySessionRecord } from '../domain';

export const getBasicStats = (cards: Flashcard[]): CardStats => {
  const totalCards = cards.length;
  const now = new Date();
  const dueCards = cards.filter(card => card.nextReview <= now).length;
  const totalReviews = cards.reduce((sum, card) => sum + card.repetitions, 0);
  const averageEasiness =
    totalCards > 0 ? cards.reduce((sum, card) => sum + card.easiness, 0) / totalCards : 0;

  const distribution = {
    new: 0,
    learning: 0,
    young: 0,
    mature: 0
  };

  cards.forEach(card => {
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
};

export const getExtendedStats = (
  cards: Flashcard[],
  sessionHistory: StudySessionRecord[],
  learningStreak: LearningStreak,
  achievements: any[] // Assuming achievements are passed from the main state
): ExtendedStats => {
  const basicStats = getBasicStats(cards);
  const completedSessions = sessionHistory.filter(session => !session.quitEarly);

  const totalStudyTime = completedSessions.reduce((sum, session) => {
    if (session.endTime) {
      return sum + (session.endTime.getTime() - session.startTime.getTime()) / (1000 * 60);
    }
    return sum;
  }, 0);

  const averageSessionLength =
    completedSessions.length > 0 ? totalStudyTime / completedSessions.length : 0;

  // Tag distribution
  const tagDistribution: Record<string, number> = {};
  cards.forEach(card => {
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

    const weekSessions = completedSessions.filter(
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
    learningStreak,
    totalStudyTime,
    sessionsCompleted: completedSessions.length,
    averageSessionLength,
    achievements,
    recentSessions: completedSessions.slice(-10),
    tagDistribution,
    weeklyProgress
  };
};
