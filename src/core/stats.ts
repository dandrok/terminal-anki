import { MS_PER_MINUTE, startOfDay } from './dates.js';
import { difficultyOf, isDue } from './sm2.js';
import type {
  CardDistribution,
  CardStats,
  Flashcard,
  StudySessionRecord,
  WeeklyProgress
} from '../types/index.js';

export function cardDistribution(cards: readonly Flashcard[]): CardDistribution {
  const distribution: CardDistribution = { new: 0, learning: 0, young: 0, mature: 0 };
  for (const card of cards) {
    distribution[difficultyOf(card)]++;
  }
  return distribution;
}

export function computeCardStats(cards: readonly Flashcard[], now: Date = new Date()): CardStats {
  const totalCards = cards.length;
  const totalReviews = cards.reduce((sum, card) => sum + card.repetitions, 0);
  const easinessSum = cards.reduce((sum, card) => sum + card.easiness, 0);

  return {
    totalCards,
    dueCards: cards.filter(card => isDue(card, now)).length,
    totalReviews,
    // Guard the division: an empty collection produced NaN, which reached the
    // stats screen as a literal "NaN".
    averageEasiness: totalCards > 0 ? easinessSum / totalCards : 0,
    distribution: cardDistribution(cards)
  };
}

export function tagDistribution(cards: readonly Flashcard[]): Record<string, number> {
  // A null-prototype object: tags are user text, and a tag named `constructor`
  // or `__proto__` would otherwise read an inherited value instead of a count.
  const distribution: Record<string, number> = Object.create(null) as Record<string, number>;
  for (const card of cards) {
    for (const tag of card.tags) {
      distribution[tag] = (distribution[tag] ?? 0) + 1;
    }
  }
  return distribution;
}

/** Total minutes across sessions that recorded an end time. */
export function totalStudyMinutes(sessions: readonly StudySessionRecord[]): number {
  return sessions.reduce((sum, session) => {
    if (!session.endTime) {
      return sum;
    }
    const elapsed = session.endTime.getTime() - session.startTime.getTime();
    return sum + Math.max(0, elapsed) / MS_PER_MINUTE;
  }, 0);
}

export function sessionAccuracy(session: StudySessionRecord): number {
  return session.cardsStudied > 0 ? (session.correctAnswers / session.cardsStudied) * 100 : 0;
}

/** Card counts and accuracy for each of the last `weeks` seven-day windows. */
export function weeklyProgress(
  sessions: readonly StudySessionRecord[],
  now: Date = new Date(),
  weeks = 4
): WeeklyProgress[] {
  const today = startOfDay(now);
  const result: WeeklyProgress[] = [];

  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - (i * 7 + 6));
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() - i * 7);
    weekEnd.setHours(23, 59, 59, 999);

    const weekSessions = sessions.filter(
      session => session.startTime >= weekStart && session.startTime <= weekEnd
    );

    const cardsStudied = weekSessions.reduce((sum, session) => sum + session.cardsStudied, 0);
    const correctAnswers = weekSessions.reduce((sum, session) => sum + session.correctAnswers, 0);

    result.push({
      week: `Week ${weeks - i}`,
      cardsStudied,
      accuracy: cardsStudied > 0 ? (correctAnswers / cardsStudied) * 100 : 0,
      sessionCount: weekSessions.length
    });
  }

  return result;
}
