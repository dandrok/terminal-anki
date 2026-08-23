import { difficultyOf, isDue } from './sm2.js';
import type { CustomStudyFilters, Flashcard } from '../types/index.js';

/** Fisher-Yates shuffle. Returns a new array; does not mutate the input. */
export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  // `sort(() => Math.random() - 0.5)` was used before, which is not a uniform
  // shuffle -- it leaves cards heavily biased toward their original position.
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function dueCards(cards: readonly Flashcard[], now: Date = new Date()): Flashcard[] {
  return cards.filter(card => isDue(card, now));
}

export function cardsByTag(cards: readonly Flashcard[], tag: string): Flashcard[] {
  const needle = tag.trim().toLowerCase();
  return cards.filter(card => card.tags.includes(needle));
}

export function cardsByDifficulty(
  cards: readonly Flashcard[],
  difficulty: CustomStudyFilters['difficulty']
): Flashcard[] {
  if (!difficulty) {
    return [...cards];
  }
  return cards.filter(card => difficultyOf(card) === difficulty);
}

export function searchCards(cards: readonly Flashcard[], query: string): Flashcard[] {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return [];
  }
  return cards.filter(
    card =>
      card.front.toLowerCase().includes(needle) ||
      card.back.toLowerCase().includes(needle) ||
      card.tags.some(tag => tag.includes(needle))
  );
}

/**
 * Apply every custom-study filter in one pass.
 *
 * All criteria are applied together. Previously the caller picked exactly one
 * of tags / difficulty / everything, so `dueOnly` had no effect at all and the
 * "study due cards (with filters)" option quietly studied the whole deck.
 */
export function applyFilters(
  cards: readonly Flashcard[],
  filters: CustomStudyFilters,
  options: { now?: Date; random?: () => number } = {}
): Flashcard[] {
  const now = options.now ?? new Date();
  let result = [...cards];

  if (filters.dueOnly) {
    result = result.filter(card => isDue(card, now));
  }

  if (filters.tags && filters.tags.length > 0) {
    const wanted = filters.tags.map(tag => tag.trim().toLowerCase());
    result = result.filter(card => wanted.some(tag => card.tags.includes(tag)));
  }

  if (filters.difficulty) {
    result = result.filter(card => difficultyOf(card) === filters.difficulty);
  }

  // Order before limiting, so a random session samples the whole matching set
  // instead of shuffling an already-truncated slice.
  if (filters.randomOrder) {
    result = shuffle(result, options.random);
  }

  if (filters.limit !== undefined && filters.limit > 0) {
    result = result.slice(0, filters.limit);
  }

  return result;
}

/** Every distinct tag across the collection, sorted. */
export function collectTags(cards: readonly Flashcard[]): string[] {
  const tags = new Set<string>();
  for (const card of cards) {
    for (const tag of card.tags) {
      tags.add(tag);
    }
  }
  return [...tags].sort();
}

/**
 * Trim, lower-case, de-space and de-duplicate a raw tag list.
 *
 * Internal whitespace becomes a hyphen because "a tag contains no whitespace"
 * is an invariant the rest of the system relies on: Anki separates tags with
 * spaces and so does our own text export, so a tag like "ultimate geography"
 * silently came back from a round trip as two tags. Importing a deck whose
 * name has a space in it — which is most of them — made that routine.
 */
export function normalizeTags(tags: readonly string[]): string[] {
  const seen = new Set<string>();
  for (const tag of tags) {
    const normalized = tag.trim().toLowerCase().replace(/\s+/g, '-');
    if (normalized) {
      seen.add(normalized);
    }
  }
  return [...seen];
}
