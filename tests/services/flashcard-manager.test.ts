import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FlashcardManager, MAX_SESSION_HISTORY } from '../../src/services/flashcard-manager.js';
import type { StudySessionRecord } from '../../src/types/index.js';

let workspace: string;
let dataFile: string;

function manager(seedSampleCards = false) {
  return new FlashcardManager({ dataFile, legacyFile: null, seedSampleCards });
}

function session(overrides: Partial<Omit<StudySessionRecord, 'id'>> = {}) {
  const startTime = overrides.startTime ?? new Date();
  return {
    startTime,
    endTime: new Date(startTime.getTime() + 60_000),
    cardsStudied: 1,
    correctAnswers: 1,
    incorrectAnswers: 0,
    averageDifficulty: 1,
    sessionType: 'due' as const,
    quitEarly: false,
    ...overrides
  };
}

beforeEach(() => {
  workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'anki-manager-'));
  dataFile = path.join(workspace, 'flashcards.json');
});

afterEach(() => {
  fs.rmSync(workspace, { recursive: true, force: true });
});

describe('card ids', () => {
  it('never reuses the id of a live card after a delete', () => {
    // Regression: ids came from cards.length + 1, so deleting a middle card
    // made the next add collide and the delete menu removed the wrong card.
    const app = manager();
    const cards = ['a', 'b', 'c', 'd', 'e'].map(front => app.addCard(front, front.toUpperCase()));

    app.deleteCard(cards[2].id);
    const added = app.addCard('f', 'F');

    const ids = app.getAllCards().map(card => card.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.filter(id => id === added.id)).toHaveLength(1);
  });

  it('deletes exactly the card that was asked for', () => {
    const app = manager();
    const keep = app.addCard('keep', 'K');
    const drop = app.addCard('drop', 'D');
    app.deleteCard(keep.id);
    app.addCard('new', 'N');

    expect(app.deleteCard(drop.id)).toBe(true);
    expect(app.getAllCards().map(card => card.front)).toEqual(['new']);
  });

  it('reports failure for an unknown id', () => {
    expect(manager().deleteCard('does-not-exist')).toBe(false);
  });
});

describe('addCard', () => {
  it('normalizes tags', () => {
    const card = manager().addCard('Q', 'A', [' Web ', 'WEB', '', 'api']);
    expect(card.tags).toEqual(['web', 'api']);
  });

  it('unlocks the first-card achievement', () => {
    const app = manager();
    app.addCard('Q', 'A');
    const first = app.getExtendedStats().achievements.find(a => a.id === 'first_card');
    expect(first?.unlockedAt).toBeInstanceOf(Date);
  });

  it('persists across a reload', () => {
    manager().addCard('Persisted', 'Yes', ['tag']);
    const reloaded = manager();
    expect(reloaded.getAllCards()).toHaveLength(1);
    expect(reloaded.getAllCards()[0]).toMatchObject({ front: 'Persisted', tags: ['tag'] });
  });
});

describe('sample cards', () => {
  it('seeds a first run', () => {
    expect(new FlashcardManager({ dataFile, legacyFile: null }).getAllCards()).toHaveLength(5);
  });

  it('does not resurrect samples after the last card is deleted', () => {
    // Regression: an empty collection re-seeded samples on every launch.
    const app = new FlashcardManager({ dataFile, legacyFile: null });
    for (const card of app.getAllCards()) {
      app.deleteCard(card.id);
    }
    expect(new FlashcardManager({ dataFile, legacyFile: null }).getAllCards()).toEqual([]);
  });

  it('gives sample cards distinct ids', () => {
    const ids = new FlashcardManager({ dataFile, legacyFile: null }).getAllCards().map(c => c.id);
    expect(new Set(ids).size).toBe(5);
  });
});

describe('reviewCard', () => {
  it('persists the new schedule', () => {
    const app = manager();
    const card = app.addCard('Q', 'A');
    app.reviewCard(card, 5);

    const reloaded = manager().getAllCards()[0];
    expect(reloaded.repetitions).toBe(1);
    expect(reloaded.lastReview).toBeInstanceOf(Date);
  });
});

describe('recordStudySession', () => {
  it('updates the streak', () => {
    const app = manager();
    app.recordStudySession(session());
    expect(app.getExtendedStats().learningStreak.currentStreak).toBe(1);
  });

  it('caps stored history', () => {
    const app = manager();
    for (let i = 0; i < MAX_SESSION_HISTORY + 10; i++) {
      app.recordStudySession(session());
    }
    expect(manager().getExtendedStats().recentSessions).toHaveLength(10);
  });

  it('counts only completed sessions toward the session achievement', () => {
    const app = manager();
    app.recordStudySession(session({ quitEarly: true }));
    const first = app.getExtendedStats().achievements.find(a => a.id === 'first_session');
    expect(first?.unlockedAt).toBeUndefined();
  });

  it('gives every session a distinct id', () => {
    const app = manager();
    const ids = [app.recordStudySession(session()).id, app.recordStudySession(session()).id];
    expect(new Set(ids).size).toBe(2);
  });
});

describe('getExtendedStats', () => {
  it('reports zero easiness rather than NaN for an empty collection', () => {
    expect(manager().getExtendedStats().averageEasiness).toBe(0);
  });

  it('reports a lapsed streak as zero', () => {
    const app = manager();
    app.recordStudySession(session({ startTime: new Date(2020, 0, 1) }));
    expect(app.getExtendedStats().learningStreak.currentStreak).toBe(0);
  });
});

describe('getFilteredCards', () => {
  it('applies dueOnly together with tags', () => {
    const app = manager();
    const due = app.addCard('due', 'x', ['t']);
    const later = app.addCard('later', 'y', ['t']);
    app.reviewCard(later, 5);
    app.addCard('other', 'z', ['u']);

    const result = app.getFilteredCards({ dueOnly: true, tags: ['t'] });
    expect(result.map(card => card.id)).toEqual([due.id]);
  });
});

describe('updateCardTags', () => {
  it('replaces and normalizes tags', () => {
    const app = manager();
    const card = app.addCard('Q', 'A', ['old']);
    expect(app.updateCardTags(card.id, [' New ', 'NEW'])).toBe(true);
    expect(app.getCardById(card.id)?.tags).toEqual(['new']);
  });

  it('returns false for an unknown card', () => {
    expect(manager().updateCardTags('nope', ['x'])).toBe(false);
  });
});
