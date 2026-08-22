import { createAchievements, evaluateAchievements } from '../core/achievements.js';
import { createId } from '../core/ids.js';
import {
  applyFilters,
  cardsByDifficulty,
  cardsByTag,
  collectTags,
  dueCards,
  normalizeTags,
  searchCards
} from '../core/filters.js';
import { initialSchedulingState, reviewCard } from '../core/sm2.js';
import {
  computeCardStats,
  sessionAccuracy,
  tagDistribution,
  totalStudyMinutes,
  weeklyProgress
} from '../core/stats.js';
import { effectiveStreak, recordStudyDay } from '../core/streaks.js';
import { FlashcardRepository, type RepositoryOptions } from '../storage/repository.js';
import type {
  CardStats,
  CustomStudyFilters,
  DifficultyLevel,
  ExtendedStats,
  Flashcard,
  PersistedData,
  ReviewQuality,
  StudySessionRecord
} from '../types/index.js';

/** Sessions kept in history; older ones are dropped on write. */
export const MAX_SESSION_HISTORY = 100;

const SAMPLE_CARDS: readonly { front: string; back: string; tags: string[] }[] = [
  { front: 'Python', back: 'A high-level programming language', tags: ['programming', 'python'] },
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
  { front: 'Git', back: 'A distributed version control system', tags: ['tools', 'version-control'] }
];

export interface FlashcardManagerOptions extends RepositoryOptions {
  /** Seed sample cards when there is no data file yet. Defaults to true. */
  seedSampleCards?: boolean;
}

/**
 * Owns the card collection and session history, and is the only place that
 * decides when state reaches disk. All rules live in `core/`; this class
 * sequences them.
 */
export class FlashcardManager {
  private readonly repository: FlashcardRepository;
  private data: PersistedData;

  constructor(options: FlashcardManagerOptions = {}) {
    const { seedSampleCards = true, ...repositoryOptions } = options;
    this.repository = new FlashcardRepository(repositoryOptions);

    const result = this.repository.load();
    this.data = result.data;

    // Sample cards seed a first run only. They are deliberately not re-created
    // when the collection is merely empty, which used to resurrect them every
    // launch after the user deleted their last card.
    if (result.isNew && seedSampleCards && !result.corruptBackup) {
      this.seedSampleCards();
    } else if (result.migratedFrom) {
      this.save();
    }
  }

  get dataFile(): string {
    return this.repository.dataFile;
  }

  private seedSampleCards(): void {
    const now = new Date();
    this.data.cards = SAMPLE_CARDS.map(sample => ({
      id: createId(),
      front: sample.front,
      back: sample.back,
      tags: normalizeTags(sample.tags),
      ...initialSchedulingState(now),
      createdAt: now
    }));
    this.save();
  }

  save(): void {
    this.repository.save(this.data);
  }

  getAllCards(): Flashcard[] {
    return [...this.data.cards];
  }

  getDueCards(now: Date = new Date()): Flashcard[] {
    return dueCards(this.data.cards, now);
  }

  getCardById(id: string): Flashcard | undefined {
    return this.data.cards.find(card => card.id === id);
  }

  addCard(front: string, back: string, tags: readonly string[] = []): Flashcard {
    const now = new Date();
    const card: Flashcard = {
      id: createId(),
      front,
      back,
      tags: normalizeTags(tags),
      ...initialSchedulingState(now),
      createdAt: now
    };

    this.data.cards.push(card);
    this.refreshAchievements();
    this.save();
    return card;
  }

  deleteCard(id: string): boolean {
    const index = this.data.cards.findIndex(card => card.id === id);
    if (index === -1) {
      return false;
    }
    this.data.cards.splice(index, 1);
    this.save();
    return true;
  }

  updateCardTags(cardId: string, tags: readonly string[]): boolean {
    const card = this.getCardById(cardId);
    if (!card) {
      return false;
    }
    card.tags = normalizeTags(tags);
    this.save();
    return true;
  }

  searchCards(query: string): Flashcard[] {
    return searchCards(this.data.cards, query);
  }

  getAllTags(): string[] {
    return collectTags(this.data.cards);
  }

  getCardsByTag(tag: string): Flashcard[] {
    return cardsByTag(this.data.cards, tag);
  }

  getCardsByDifficulty(difficulty: DifficultyLevel): Flashcard[] {
    return cardsByDifficulty(this.data.cards, difficulty);
  }

  getFilteredCards(filters: CustomStudyFilters, now: Date = new Date()): Flashcard[] {
    return applyFilters(this.data.cards, filters, { now });
  }

  /** Grade a card and persist the new schedule. */
  reviewCard(card: Flashcard, quality: ReviewQuality, now: Date = new Date()): void {
    reviewCard(card, quality, now);
    this.save();
  }

  getStats(now: Date = new Date()): CardStats {
    return computeCardStats(this.data.cards, now);
  }

  getExtendedStats(now: Date = new Date()): ExtendedStats {
    const sessions = this.data.sessionHistory;
    const completedSessions = sessions.filter(session => !session.quitEarly);
    const studyMinutes = totalStudyMinutes(sessions);

    return {
      ...computeCardStats(this.data.cards, now),
      learningStreak: {
        ...this.data.learningStreak,
        currentStreak: effectiveStreak(this.data.learningStreak, now)
      },
      totalStudyTime: studyMinutes,
      sessionsCompleted: completedSessions.length,
      averageSessionLength:
        completedSessions.length > 0 ? studyMinutes / completedSessions.length : 0,
      achievements: this.data.achievements,
      recentSessions: sessions.slice(-10),
      tagDistribution: tagDistribution(this.data.cards),
      weeklyProgress: weeklyProgress(sessions, now)
    };
  }

  /** Append a finished session, then update the streak and achievements. */
  recordStudySession(sessionData: Omit<StudySessionRecord, 'id'>): StudySessionRecord {
    const session: StudySessionRecord = { ...sessionData, id: createId() };

    this.data.sessionHistory.push(session);
    if (this.data.sessionHistory.length > MAX_SESSION_HISTORY) {
      this.data.sessionHistory = this.data.sessionHistory.slice(-MAX_SESSION_HISTORY);
    }

    this.data.learningStreak = recordStudyDay(this.data.learningStreak, session.startTime);
    this.refreshAchievements(session);
    this.save();

    return session;
  }

  private refreshAchievements(session?: StudySessionRecord, now: Date = new Date()): void {
    if (this.data.achievements.length === 0) {
      this.data.achievements = createAchievements();
    }

    this.data.achievements = evaluateAchievements(
      this.data.achievements,
      {
        totalCards: this.data.cards.length,
        totalReviews: this.data.cards.reduce((sum, card) => sum + card.repetitions, 0),
        sessionsCompleted: this.data.sessionHistory.filter(entry => !entry.quitEarly).length,
        currentStreak: effectiveStreak(this.data.learningStreak, now),
        lastSessionAccuracy: session ? sessionAccuracy(session) : null
      },
      now
    );
  }
}
