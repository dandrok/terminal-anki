import { describe, expect, it } from 'vitest';
import {
  applyImport,
  describeReport,
  planImport,
  type ImportedNote
} from '../../src/core/import.js';
import type { Flashcard } from '../../src/types/index.js';

const NOW = new Date(2026, 7, 23, 12, 0);

function note(overrides: Partial<ImportedNote> = {}): ImportedNote {
  return { fields: ['Front', 'Back'], tags: [], ...overrides };
}

function card(overrides: Partial<Flashcard> = {}): Flashcard {
  return {
    id: 'existing-1',
    front: 'Front',
    back: 'Back',
    tags: [],
    easiness: 2.5,
    interval: 1,
    repetitions: 0,
    nextReview: NOW,
    lastReview: null,
    createdAt: NOW,
    ...overrides
  };
}

describe('planImport basics', () => {
  it('turns a note into a card', () => {
    const plan = planImport([note()], [], { now: NOW });
    expect(plan.added).toHaveLength(1);
    expect(plan.added[0]).toMatchObject({ front: 'Front', back: 'Back' });
    expect(plan.report).toMatchObject({ read: 1, added: 1 });
  });

  it('gives each card a fresh id', () => {
    const plan = planImport([note({ fields: ['a', 'b'] }), note({ fields: ['c', 'd'] })], [], {
      now: NOW
    });
    expect(new Set(plan.added.map(entry => entry.id)).size).toBe(2);
  });

  it('reads the field indices it is told to', () => {
    const plan = planImport([note({ fields: ['id', 'question', 'answer'] })], [], {
      frontField: 1,
      backField: 2,
      now: NOW
    });
    expect(plan.added[0]).toMatchObject({ front: 'question', back: 'answer' });
  });

  it('normalises tags and adds the extras', () => {
    const plan = planImport([note({ tags: ['Verbs', ' SPANISH '] })], [], {
      extraTags: ['imported'],
      now: NOW
    });
    expect(plan.added[0].tags).toEqual(['verbs', 'spanish', 'imported']);
  });

  it('converts HTML fields', () => {
    const plan = planImport([note({ fields: ['<b>Front</b>', '<div>Back</div>'] })], [], {
      now: NOW
    });
    expect(plan.added[0]).toMatchObject({ front: 'Front', back: 'Back' });
  });

  it('leaves fields alone when told they are not HTML', () => {
    const plan = planImport([note({ fields: ['a < b', '<literal>'] })], [], {
      html: false,
      now: NOW
    });
    expect(plan.added[0]).toMatchObject({ front: 'a < b', back: '<literal>' });
  });

  it('samples the first few cards so a wrong mapping is visible', () => {
    const notes = Array.from({ length: 10 }, (_v, index) =>
      note({ fields: [`q${index}`, `a${index}`] })
    );
    const plan = planImport(notes, [], { now: NOW });
    expect(plan.report.sample).toHaveLength(3);
    expect(plan.report.sample[0].front).toBe('q0');
  });
});

describe('planImport rejections', () => {
  it('skips cloze notes and counts them', () => {
    const plan = planImport([note({ fields: ['The capital is {{c1::Paris}}', ''] }), note()], [], {
      now: NOW
    });
    expect(plan.report.skippedCloze).toBe(1);
    expect(plan.report.added).toBe(1);
  });

  it.each([
    [['', 'back'], 'no front'],
    [['front', ''], 'no back'],
    [['', ''], 'neither'],
    [['<div></div>', 'back'], 'a front that is only markup']
  ])('skips a note with %s', (fields, _name) => {
    const plan = planImport([note({ fields })], [], { now: NOW });
    expect(plan.report.skippedEmpty).toBe(1);
    expect(plan.added).toHaveLength(0);
  });

  it('keeps a card whose side is only an image', () => {
    // "What is this?" with nothing but a picture is a real card.
    const plan = planImport([note({ fields: ['<img src="x.png">', 'A heart'] })], [], { now: NOW });
    expect(plan.added).toHaveLength(1);
    expect(plan.report.skippedEmpty).toBe(0);
    expect(plan.added[0].media).toEqual(['x.png']);
  });

  it('counts a reverse card it did not create, but keeps the forward one', () => {
    const plan = planImport([note({ cardCount: 2 })], [], { now: NOW });
    expect(plan.report.reverseNotCreated).toBe(1);
    expect(plan.added).toHaveLength(1);
  });

  it('counts dropped audio', () => {
    const plan = planImport([note({ fields: ['Say [sound:a.mp3] this', 'Back'] })], [], {
      now: NOW
    });
    expect(plan.report.soundsDropped).toBe(1);
    expect(plan.added[0].front).toBe('Say this');
  });
});

describe('planImport duplicates', () => {
  it('is idempotent by guid', () => {
    const existing = [card({ guid: 'g1' })];
    const plan = planImport([note({ guid: 'g1' })], existing, { now: NOW });
    expect(plan.added).toHaveLength(0);
    expect(plan.report.updated).toBe(1);
  });

  it('refreshes the text of a guid match but keeps its scheduling', () => {
    // Re-importing an updated deck must not throw away progress made so far.
    const existing = [
      card({ guid: 'g1', interval: 30, repetitions: 6, easiness: 2.9, front: 'Old' })
    ];
    const plan = planImport([note({ guid: 'g1', fields: ['New', 'Back'] })], existing, {
      now: NOW
    });
    expect(plan.updated[0]).toMatchObject({
      id: 'existing-1',
      front: 'New',
      interval: 30,
      repetitions: 6,
      easiness: 2.9
    });
  });

  it('clears media a refreshed card no longer references', () => {
    // Spreading media only when non-empty left the card holding a file list
    // from before, pointing at a picture its text no longer mentions.
    const existing = [card({ guid: 'g1', media: ['old.png'] })];
    const plan = planImport([note({ guid: 'g1', fields: ['No image now', 'Back'] })], existing, {
      now: NOW
    });
    expect(plan.updated[0].media).toBeUndefined();
  });

  it('replaces media a refreshed card does reference', () => {
    const existing = [card({ guid: 'g1', media: ['old.png'] })];
    const plan = planImport(
      [note({ guid: 'g1', fields: ['<img src="new.png">', 'Back'] })],
      existing,
      { now: NOW }
    );
    expect(plan.updated[0].media).toEqual(['new.png']);
  });

  it('treats a text match without a guid as already present', () => {
    // Overwriting would discard an edit the learner made themselves.
    const existing = [card({ front: 'Front', back: 'My own better answer' })];
    const plan = planImport([note()], existing, { now: NOW });
    expect(plan.report.duplicates).toBe(1);
    expect(plan.added).toHaveLength(0);
    expect(plan.updated).toHaveLength(0);
  });

  it.each([
    ['Front', 'exact'],
    ['  front  ', 'case and padding'],
    ['FRONT', 'case'],
    ['Front\n\nagain', 'no match', false]
  ])('matches %j on %s', (front, _name, shouldMatch = true) => {
    const existing = [card({ front: 'Front' })];
    const plan = planImport([note({ fields: [front, 'Back'] })], existing, { now: NOW });
    expect(plan.report.duplicates).toBe(shouldMatch ? 1 : 0);
  });

  it('recognises a card imported earlier without a guid', () => {
    // Importing a deck as a text file and later as a package: the package has
    // guids and the existing cards do not, so a guid-only match added the whole
    // deck a second time.
    const fromText = [card({ front: 'Bonjour', back: 'Hello' })];
    const plan = planImport(
      [note({ guid: 'g-from-package', fields: ['Bonjour', 'Hello'] })],
      fromText,
      { now: NOW }
    );

    expect(plan.added).toHaveLength(0);
    expect(plan.report.duplicates).toBe(1);
  });

  it('still prefers a guid match over a text match', () => {
    const existing = [
      card({ id: 'by-guid', guid: 'g1', front: 'Different text' }),
      card({ id: 'by-text', front: 'Front' })
    ];
    const plan = planImport([note({ guid: 'g1' })], existing, { now: NOW });
    expect(plan.updated[0].id).toBe('by-guid');
  });

  it('does not import the same note twice from one file', () => {
    // A deck can repeat a note; importing it twice in one run is just as wrong
    // as importing it twice across runs.
    const plan = planImport([note({ guid: 'g1' }), note({ guid: 'g1' })], [], { now: NOW });
    expect(plan.added).toHaveLength(1);
    expect(plan.report.duplicates).toBe(1);
  });

  it('deduplicates within a file on text when there are no guids', () => {
    const plan = planImport([note(), note()], [], { now: NOW });
    expect(plan.added).toHaveLength(1);
    expect(plan.report.duplicates).toBe(1);
  });
});

describe('planImport scheduling', () => {
  it('starts a card new by default', () => {
    const plan = planImport([note()], [], { now: NOW });
    expect(plan.added[0]).toMatchObject({ repetitions: 0, interval: 1, easiness: 2.5 });
  });

  it('carries scheduling across when the source has it', () => {
    const plan = planImport(
      [
        note({
          scheduling: {
            easiness: 2.9,
            interval: 45,
            repetitions: 8,
            nextReview: new Date(2026, 8, 1)
          }
        })
      ],
      [],
      { now: NOW }
    );
    expect(plan.added[0]).toMatchObject({ easiness: 2.9, interval: 45, repetitions: 8 });
    expect(plan.added[0].nextReview).toEqual(new Date(2026, 8, 1));
  });
});

describe('applyImport', () => {
  it('appends new cards', () => {
    const existing = [card({ id: 'a' })];
    const plan = planImport([note({ fields: ['New', 'Card'] })], existing, { now: NOW });
    const result = applyImport(existing, plan);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('a');
  });

  it('replaces an updated card in place rather than appending it', () => {
    const existing = [card({ id: 'a', guid: 'g1' }), card({ id: 'b', front: 'Other' })];
    const plan = planImport([note({ guid: 'g1', fields: ['Changed', 'Back'] })], existing, {
      now: NOW
    });
    const result = applyImport(existing, plan);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ id: 'a', front: 'Changed' });
    expect(result[1].id).toBe('b');
  });

  it('leaves the input untouched', () => {
    const existing = [card({ id: 'a' })];
    const before = JSON.stringify(existing);
    applyImport(existing, planImport([note({ fields: ['x', 'y'] })], existing, { now: NOW }));
    expect(JSON.stringify(existing)).toBe(before);
  });
});

describe('describeReport', () => {
  it('says plainly when nothing was added', () => {
    const { report } = planImport([], [], { now: NOW });
    expect(describeReport(report).join(' ')).toContain('Nothing to add');
  });

  it('names every thing it could not do', () => {
    const notes = [
      note({ fields: ['{{c1::x}}', 'y'] }),
      note({ fields: ['', ''] }),
      note({ cardCount: 2, fields: ['a [sound:s.mp3]', 'b'] })
    ];
    const lines = describeReport(planImport(notes, [], { now: NOW }).report).join('\n');
    expect(lines).toContain('1 cloze notes skipped');
    expect(lines).toContain('reverse card that was not created');
    expect(lines).toContain('no front or no back');
    expect(lines).toContain('audio references dropped');
  });
});
