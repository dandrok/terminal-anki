import { describe, expect, it } from 'vitest';
import {
  applyFilters,
  cardsByDifficulty,
  cardsByTag,
  collectTags,
  dueCards,
  normalizeTags,
  searchCards,
  shuffle
} from '../../src/core/filters.js';
import { makeCard } from '../helpers.js';

const NOW = new Date(2026, 7, 22, 12, 0);
const past = new Date(NOW.getTime() - 1000);
const future = new Date(NOW.getTime() + 1000);

const collection = [
  makeCard({ id: 'a', front: 'Python', tags: ['programming'], interval: 1, nextReview: past }),
  makeCard({
    id: 'b',
    front: 'Algorithm',
    tags: ['programming', 'theory'],
    interval: 5,
    nextReview: past
  }),
  makeCard({ id: 'c', front: 'Database', tags: ['storage'], interval: 20, nextReview: future }),
  makeCard({ id: 'd', front: 'Kernel', tags: ['systems'], interval: 90, nextReview: future })
];

const ids = (cards: { id: string }[]) => cards.map(card => card.id);

describe('dueCards', () => {
  it('keeps only cards whose review time has passed', () => {
    expect(ids(dueCards(collection, NOW))).toEqual(['a', 'b']);
  });
});

describe('cardsByTag', () => {
  it('matches case-insensitively', () => {
    expect(ids(cardsByTag(collection, 'PROGRAMMING'))).toEqual(['a', 'b']);
  });
});

describe('cardsByDifficulty', () => {
  it('selects a single bucket', () => {
    expect(ids(cardsByDifficulty(collection, 'mature'))).toEqual(['d']);
  });

  it('returns everything when no bucket is given', () => {
    expect(ids(cardsByDifficulty(collection, undefined))).toEqual(['a', 'b', 'c', 'd']);
  });
});

describe('searchCards', () => {
  it('matches front, back and tags', () => {
    expect(ids(searchCards(collection, 'python'))).toEqual(['a']);
    expect(ids(searchCards(collection, 'storage'))).toEqual(['c']);
  });

  it('returns nothing for an empty query', () => {
    expect(searchCards(collection, '   ')).toEqual([]);
  });
});

describe('applyFilters', () => {
  it('honours dueOnly', () => {
    // Regression: the "study due cards (with filters)" option ignored this and
    // studied the whole collection.
    expect(ids(applyFilters(collection, { dueOnly: true }, { now: NOW }))).toEqual(['a', 'b']);
  });

  it('combines dueOnly, tags and difficulty in a single pass', () => {
    const result = applyFilters(
      collection,
      { dueOnly: true, tags: ['programming'], difficulty: 'learning' },
      { now: NOW }
    );
    expect(ids(result)).toEqual(['b']);
  });

  it('matches any of the requested tags', () => {
    expect(ids(applyFilters(collection, { tags: ['storage', 'systems'] }, { now: NOW }))).toEqual([
      'c',
      'd'
    ]);
  });

  it('applies the limit last so a random session samples the whole set', () => {
    const result = applyFilters(
      collection,
      { limit: 2, randomOrder: true },
      { now: NOW, random: () => 0.99 }
    );
    expect(result).toHaveLength(2);
  });

  it('ignores a non-positive limit', () => {
    expect(applyFilters(collection, { limit: 0 }, { now: NOW })).toHaveLength(4);
  });

  it('does not mutate the input collection', () => {
    const snapshot = ids(collection);
    applyFilters(collection, { randomOrder: true }, { now: NOW, random: () => 0 });
    expect(ids(collection)).toEqual(snapshot);
  });

  it('returns an empty list when nothing matches', () => {
    expect(applyFilters(collection, { tags: ['nope'] }, { now: NOW })).toEqual([]);
  });
});

describe('shuffle', () => {
  it('preserves every element', () => {
    const input = [1, 2, 3, 4, 5];
    expect([...shuffle(input)].sort()).toEqual(input);
  });

  it('does not mutate the input', () => {
    const input = [1, 2, 3];
    shuffle(input, () => 0);
    expect(input).toEqual([1, 2, 3]);
  });

  it('is uniform enough that the first element is not pinned', () => {
    // sort(() => Math.random() - 0.5) leaves items strongly biased toward
    // their original index; Fisher-Yates does not.
    const positions = new Set<number>();
    for (let i = 0; i < 200; i++) {
      positions.add(shuffle([0, 1, 2, 3, 4]).indexOf(0));
    }
    expect(positions.size).toBe(5);
  });
});

describe('collectTags', () => {
  it('returns distinct tags in sorted order', () => {
    expect(collectTags(collection)).toEqual(['programming', 'storage', 'systems', 'theory']);
  });
});

describe('normalizeTags', () => {
  it('trims, lower-cases, drops blanks and de-duplicates', () => {
    expect(normalizeTags([' Web ', 'web', 'API', '', '   '])).toEqual(['web', 'api']);
  });
});
