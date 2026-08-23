import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runExport, runImport } from '../../src/cli/transfer.js';
import { parseArgs } from '../../src/cli/args.js';
import { createStore } from '../../src/state/store.js';
import { selectCards } from '../../src/state/selectors.js';

/**
 * Driven through argv and real files, deliberately.
 *
 * These are the paths a person actually uses, and the parts most likely to be
 * wrong are the joins between them — argument parsing, file reading, the store.
 */

let workspace: string;
let previousDataDir: string | undefined;

const NOW = new Date(2026, 7, 23, 12, 0);

function run(argv: string[]) {
  const args = parseArgs(argv);
  return args.command === 'export' ? runExport(args) : runImport(args, NOW);
}

function write(name: string, contents: string): string {
  const file = path.join(workspace, name);
  fs.writeFileSync(file, contents);
  return file;
}

function storedCards() {
  const store = createStore({ seedSampleCards: false });
  try {
    return [...selectCards(store.getSnapshot())];
  } finally {
    store.dispose();
  }
}

beforeEach(() => {
  workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'anki-transfer-'));
  previousDataDir = process.env.TERMINAL_ANKI_DATA_DIR;
  process.env.TERMINAL_ANKI_DATA_DIR = path.join(workspace, 'data');
});

afterEach(() => {
  if (previousDataDir === undefined) {
    delete process.env.TERMINAL_ANKI_DATA_DIR;
  } else {
    process.env.TERMINAL_ANKI_DATA_DIR = previousDataDir;
  }
  fs.rmSync(workspace, { recursive: true, force: true });
});

const DECK = [
  '#separator:tab',
  '#html:false',
  '#tags column:3',
  'What is the capital of France?\tParis\tgeography europe',
  'What is 2 + 2?\t4\tmaths'
].join('\n');

describe('runImport', () => {
  it('imports a text deck', () => {
    const file = write('deck.csv', DECK);
    const result = run(['import', file]);

    expect(result.code).toBe(0);
    expect(result.lines.join('\n')).toContain('2 added');

    const cards = storedCards();
    expect(cards).toHaveLength(2);
    expect(cards[0]).toMatchObject({ front: 'What is the capital of France?', back: 'Paris' });
    expect(cards[0].tags).toEqual(['geography', 'europe']);
  });

  it('is idempotent when the deck carries guids', () => {
    const file = write(
      'deck.csv',
      ['#separator:tab', '#guid column:1', '#tags column:4', 'g1\tFront\tBack\tt'].join('\n')
    );

    run(['import', file]);
    const second = run(['import', file]);

    expect(storedCards()).toHaveLength(1);
    expect(second.lines.join('\n')).toContain('1 updated');
  });

  it('does not add a deck again when the second copy carries guids', () => {
    // The realistic path: import an Anki text export, then import the same
    // deck as a package. Only the package has guids.
    const plain = write('plain.csv', DECK);
    run(['import', plain]);
    const before = storedCards().length;

    const withGuids = write(
      'guids.csv',
      [
        '#separator:tab',
        '#guid column:1',
        '#tags column:4',
        'g1\tWhat is the capital of France?\tParis\tgeography',
        'g2\tWhat is 2 + 2?\t4\tmaths'
      ].join('\n')
    );
    run(['import', withGuids]);

    expect(storedCards()).toHaveLength(before);
  });

  it('does not duplicate a deck without guids either', () => {
    const file = write('deck.csv', DECK);
    run(['import', file]);
    run(['import', file]);
    expect(storedCards()).toHaveLength(2);
  });

  it('writes nothing on a dry run', () => {
    const file = write('deck.csv', DECK);
    const result = run(['import', file, '--dry-run']);

    expect(result.code).toBe(0);
    expect(result.lines.join('\n')).toContain('nothing was written');
    expect(storedCards()).toHaveLength(0);
  });

  it('shows the first cards so a wrong mapping is visible', () => {
    const file = write('deck.csv', DECK);
    const output = run(['import', file, '--dry-run']).lines.join('\n');
    expect(output).toContain('First cards:');
    expect(output).toContain('Paris');
    expect(output).toContain('--front and --back');
  });

  it('honours --front and --back', () => {
    const file = write('deck.csv', ['#separator:tab', 'ignore\tquestion\tanswer'].join('\n'));
    run(['import', file, '--front', '2', '--back', '3']);
    expect(storedCards()[0]).toMatchObject({ front: 'question', back: 'answer' });
  });

  it('applies --tag to everything', () => {
    const file = write('deck.csv', DECK);
    run(['import', file, '--tag', 'french']);
    for (const card of storedCards()) {
      expect(card.tags).toContain('french');
    }
  });

  it('converts HTML when the file says the fields are HTML', () => {
    const file = write(
      'deck.csv',
      ['#separator:tab', '#html:true', '<b>Bold</b>\t<div>Answer</div>'].join('\n')
    );
    run(['import', file]);
    expect(storedCards()[0]).toMatchObject({ front: 'Bold', back: 'Answer' });
  });

  it('leaves markup alone when the file says the fields are not HTML', () => {
    const file = write('deck.csv', ['#separator:tab', '#html:false', 'a < b\t<x>'].join('\n'));
    run(['import', file]);
    expect(storedCards()[0]).toMatchObject({ front: 'a < b', back: '<x>' });
  });

  it('says there is nothing to import when given no file', () => {
    const result = run(['import']);
    expect(result.code).toBe(1);
    expect(result.lines.join('\n')).toContain('Nothing to import');
  });

  it('says when the file does not exist', () => {
    // Rooted in the workspace, so the result cannot depend on what happens to
    // sit in the working directory when the suite runs.
    const result = run(['import', path.join(workspace, 'missing.csv')]);
    expect(result.code).toBe(1);
    expect(result.lines.join('\n')).toContain('No such file');
  });

  it('says when it does not know the format', () => {
    const result = run(['import', write('deck.docx', 'x')]);
    expect(result.code).toBe(1);
    expect(result.lines.join('\n')).toContain('know how to read');
  });

  it('explains a package file it cannot open', () => {
    const file = write('deck.apkg', 'this is not a zip');
    const result = run(['import', file]);
    expect(result.code).toBe(1);
    expect(result.lines.join('\n')).toContain('Could not read deck.apkg');
  });

  it('reports an empty file rather than importing nothing quietly', () => {
    const file = write('deck.csv', '#separator:tab\n');
    expect(run(['import', file]).code).toBe(1);
  });
});

describe('runExport', () => {
  it('round-trips a deck through export and import', () => {
    const source = write('in.csv', DECK);
    run(['import', source]);

    const target = path.join(workspace, 'out.csv');
    const exported = run(['export', target]);
    expect(exported.code).toBe(0);
    expect(fs.existsSync(target)).toBe(true);

    // Re-importing our own export must not duplicate the deck.
    const before = storedCards();
    run(['import', target]);
    const after = storedCards();
    expect(after).toHaveLength(before.length);
  });

  it('writes a file Anki can read', () => {
    write('in.csv', DECK);
    run(['import', path.join(workspace, 'in.csv')]);
    const target = path.join(workspace, 'out.csv');
    run(['export', target]);

    const contents = fs.readFileSync(target, 'utf-8');
    expect(contents).toContain('#separator:tab');
    expect(contents).toContain('#html:false');
    expect(contents).toContain('Paris');
  });

  it('refuses to overwrite the collection it is exporting', () => {
    // `anki export flashcards.json` would otherwise write a text file over the
    // only copy of the deck.
    write('in.csv', DECK);
    run(['import', path.join(workspace, 'in.csv')]);

    const collection = path.join(workspace, 'data', 'flashcards.json');
    const result = run(['export', collection]);

    expect(result.code).toBe(1);
    expect(result.lines.join('\n')).toContain('Refusing to overwrite');
    expect(JSON.parse(fs.readFileSync(collection, 'utf-8')).cards).toHaveLength(2);
  });

  it('refuses a symlink pointing at the collection', () => {
    // Comparing the resolved strings alone let this through, and the file it
    // pointed at was the only copy of the deck.
    write('in.csv', DECK);
    run(['import', path.join(workspace, 'in.csv')]);

    const collection = path.join(workspace, 'data', 'flashcards.json');
    const decoy = path.join(workspace, 'looks-innocent.csv');
    fs.symlinkSync(collection, decoy);

    const result = run(['export', decoy]);
    expect(result.code).toBe(1);
    expect(result.lines.join('\n')).toContain('Refusing to overwrite');
    expect(JSON.parse(fs.readFileSync(collection, 'utf-8')).cards).toHaveLength(2);
  });

  it('says so when there is nothing to export', () => {
    const result = run(['export', path.join(workspace, 'out.csv')]);
    expect(result.code).toBe(1);
    expect(result.lines.join('\n')).toContain('collection is empty');
  });

  it('needs somewhere to write', () => {
    expect(run(['export']).code).toBe(1);
  });

  it('leaves no temporary file behind', () => {
    write('in.csv', DECK);
    run(['import', path.join(workspace, 'in.csv')]);
    run(['export', path.join(workspace, 'out.csv')]);
    expect(fs.readdirSync(workspace).filter(name => name.includes('.tmp'))).toEqual([]);
  });
});

describe('runImport from an Anki package', () => {
  const fixture = (name: string) => path.join(process.cwd(), 'tests', 'fixtures', name);

  it('imports a legacy package', () => {
    const result = run(['import', fixture('legacy.apkg')]);
    expect(result.code).toBe(0);

    const cards = storedCards();
    expect(cards.map(card => card.front)).toContain('hola');
    expect(cards.find(card => card.front === 'hola')?.back).toBe('hello');
  });

  it('imports a modern zstd package identically', () => {
    run(['import', fixture('modern.apkg')]);
    const fromModern = storedCards()
      .map(card => card.front)
      .sort();

    fs.rmSync(path.join(workspace, 'data'), { recursive: true, force: true });
    run(['import', fixture('legacy.apkg')]);
    expect(
      storedCards()
        .map(card => card.front)
        .sort()
    ).toEqual(fromModern);
  });

  it('says which format it read and names the deck', () => {
    const output = run(['import', fixture('legacy.apkg'), '--dry-run']).lines.join('\n');
    expect(output).toContain('collection.anki2');
    expect(output).toContain('Spanish::Verbs');
  });

  it('converts the HTML that fills a real deck', () => {
    run(['import', fixture('legacy.apkg')]);
    const cat = storedCards().find(card => card.front.startsWith('el gato'));
    // <i> dropped, <br> became a line break.
    expect(cat?.front).toBe('el gato\n(animal)');
  });

  it('keeps the scheduling instead of resetting the deck to new', () => {
    run(['import', fixture('legacy.apkg')]);
    const reviewed = storedCards().find(card => card.front === 'hola');
    expect(reviewed).toMatchObject({ interval: 45, repetitions: 7, easiness: 2.65 });
  });

  it('tags each card with the deck it was actually in', () => {
    run(['import', fixture('legacy.apkg')]);
    const cards = storedCards();
    expect(cards.find(card => card.front === 'hola')?.tags).toContain('spanish::verbs');
    // This one sits in Default, which is nobody's choice of deck.
    expect(cards.find(card => card.front === 'correr')?.tags).not.toContain('spanish::verbs');
  });

  it('stores the images and points the card text at them', () => {
    run(['import', fixture('legacy.apkg')]);
    const withImage = storedCards().find(card => card.media && card.media.length > 0);
    expect(withImage).toBeDefined();

    const stored = path.join(workspace, 'data', 'media', withImage!.media![0]);
    expect(fs.existsSync(stored)).toBe(true);
    expect(fs.readFileSync(stored).subarray(1, 4).toString('utf-8')).toBe('PNG');
    expect(withImage!.front).toContain(withImage!.media![0]);
  });

  it('stores no media on a dry run', () => {
    run(['import', fixture('legacy.apkg'), '--dry-run']);
    expect(fs.existsSync(path.join(workspace, 'data', 'media'))).toBe(false);
  });

  it('reports what it could not bring across', () => {
    const output = run(['import', fixture('legacy.apkg'), '--dry-run']).lines.join('\n');
    expect(output).toContain('cloze notes skipped');
    expect(output).toContain('reverse card that was not created');
    expect(output).toContain('audio references dropped');
  });

  it('is idempotent, and across formats', () => {
    // Both packages hold the same notes with the same guids, so the second
    // import should refresh rather than duplicate.
    run(['import', fixture('legacy.apkg')]);
    const first = storedCards().length;

    const second = run(['import', fixture('modern.apkg')]);
    expect(storedCards()).toHaveLength(first);
    expect(second.lines.join('\n')).toContain('updated');
  });

  it('refuses a package with no collection in it', () => {
    const result = run(['import', fixture('not-a-deck.apkg')]);
    expect(result.code).toBe(1);
    expect(result.lines.join('\n')).toContain('no Anki collection');
  });

  it('exports what it imported', () => {
    run(['import', fixture('legacy.apkg')]);
    const target = path.join(workspace, 'out.csv');
    expect(run(['export', target]).code).toBe(0);

    const contents = fs.readFileSync(target, 'utf-8');
    expect(contents).toContain('hola');
    // An image becomes a readable placeholder outside this application.
    expect(contents).toContain('[image:');
  });
});
