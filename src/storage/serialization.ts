import { createId } from '../core/ids.js';
import { createAchievements } from '../core/achievements.js';
import { emptyStreak } from '../core/streaks.js';
import { DEFAULT_EASINESS } from '../core/sm2.js';
import { normalizeTags } from '../core/filters.js';
import type {
  Achievement,
  Flashcard,
  LearningStreak,
  PersistedData,
  SessionType,
  StudySessionRecord
} from '../types/index.js';

export const SCHEMA_VERSION = 2;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function toDate(value: unknown, fallback: Date): Date {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return fallback;
}

function toOptionalDate(value: unknown): Date | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }
  const parsed = toDate(value, new Date(NaN));
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function toFiniteNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function toText(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/**
 * Coerce one stored card into a valid `Flashcard`.
 *
 * Everything read from disk is untrusted: dates arrive as strings, older files
 * predate the `tags` field, and a hand-edited file can contain anything.
 */
export function normalizeCard(raw: unknown, seenIds: Set<string>): Flashcard | null {
  if (!isRecord(raw)) {
    return null;
  }

  const front = toText(raw.front);
  const back = toText(raw.back);
  if (!front && !back) {
    return null;
  }

  const rawId = toText(raw.id);
  const id = rawId && !seenIds.has(rawId) ? rawId : createId();
  seenIds.add(id);

  const createdAt = toDate(raw.createdAt, new Date());

  return {
    id,
    front,
    back,
    tags: normalizeTags(toArray(raw.tags).filter((tag): tag is string => typeof tag === 'string')),
    easiness: Math.max(1.3, toFiniteNumber(raw.easiness, DEFAULT_EASINESS)),
    interval: Math.max(0, toFiniteNumber(raw.interval, 1)),
    repetitions: Math.max(0, Math.floor(toFiniteNumber(raw.repetitions, 0))),
    nextReview: toDate(raw.nextReview, createdAt),
    lastReview: toOptionalDate(raw.lastReview) ?? null,
    createdAt
  };
}

const SESSION_TYPES: readonly SessionType[] = ['due', 'custom', 'all'];

export function normalizeSession(raw: unknown): StudySessionRecord | null {
  if (!isRecord(raw)) {
    return null;
  }

  const startTime = toOptionalDate(raw.startTime);
  if (!startTime) {
    return null;
  }

  const cardsStudied = Math.max(0, Math.floor(toFiniteNumber(raw.cardsStudied, 0)));
  const correctAnswers = Math.min(
    cardsStudied,
    Math.max(0, Math.floor(toFiniteNumber(raw.correctAnswers, 0)))
  );
  const sessionType = SESSION_TYPES.includes(raw.sessionType as SessionType)
    ? (raw.sessionType as SessionType)
    : 'due';

  return {
    id: toText(raw.id) || createId(),
    startTime,
    endTime: toOptionalDate(raw.endTime),
    cardsStudied,
    correctAnswers,
    incorrectAnswers: cardsStudied - correctAnswers,
    averageDifficulty: toFiniteNumber(raw.averageDifficulty, 0),
    sessionType,
    customFilters: isRecord(raw.customFilters) ? raw.customFilters : undefined,
    quitEarly: raw.quitEarly === true
  };
}

/**
 * Merge a stored streak over the empty default.
 *
 * A partial object used to be accepted wholesale, so a file missing
 * `studyDates` made the next session throw on `studyDates.includes`.
 */
export function normalizeStreak(raw: unknown): LearningStreak {
  const base = emptyStreak();
  if (!isRecord(raw)) {
    return base;
  }

  return {
    currentStreak: Math.max(0, Math.floor(toFiniteNumber(raw.currentStreak, 0))),
    longestStreak: Math.max(0, Math.floor(toFiniteNumber(raw.longestStreak, 0))),
    lastStudyDate: toOptionalDate(raw.lastStudyDate) ?? null,
    studyDates: toArray(raw.studyDates)
      .filter((date): date is string => typeof date === 'string')
      .sort()
  };
}

/**
 * Rebuild the achievement list from the current definitions, carrying over
 * stored unlock times and progress. Definitions added in a later release are
 * picked up instead of being missing forever.
 */
export function normalizeAchievements(raw: unknown): Achievement[] {
  const stored = new Map<string, Record<string, unknown>>();
  for (const entry of toArray(raw)) {
    if (isRecord(entry) && typeof entry.id === 'string') {
      stored.set(entry.id, entry);
    }
  }

  return createAchievements().map(achievement => {
    const previous = stored.get(achievement.id);
    if (!previous) {
      return achievement;
    }

    const unlockedAt = toOptionalDate(previous.unlockedAt);
    const previousProgress = isRecord(previous.progress) ? previous.progress : {};

    return {
      ...achievement,
      ...(unlockedAt ? { unlockedAt } : {}),
      progress: {
        ...achievement.progress,
        current: Math.min(
          achievement.progress.required,
          Math.max(0, Math.floor(toFiniteNumber(previousProgress.current, 0)))
        )
      }
    };
  });
}

/** Coerce a parsed data file into a fully-formed `PersistedData`. */
export function normalizePersistedData(raw: unknown): PersistedData {
  const root = isRecord(raw) ? raw : {};
  const seenIds = new Set<string>();

  return {
    version: SCHEMA_VERSION,
    cards: toArray(root.cards)
      .map(card => normalizeCard(card, seenIds))
      .filter((card): card is Flashcard => card !== null),
    sessionHistory: toArray(root.sessionHistory)
      .map(normalizeSession)
      .filter((session): session is StudySessionRecord => session !== null),
    learningStreak: normalizeStreak(root.learningStreak),
    achievements: normalizeAchievements(root.achievements)
  };
}

export function emptyPersistedData(): PersistedData {
  return {
    version: SCHEMA_VERSION,
    cards: [],
    sessionHistory: [],
    learningStreak: emptyStreak(),
    achievements: createAchievements()
  };
}
