import fs from 'node:fs';
import path from 'node:path';
import { createStore } from '../state/store.js';
import { selectCards } from '../state/selectors.js';
import { formatAnkiText, parseAnkiText, type ExportRow } from '../core/csv.js';
import { describeReport, planImport, type ImportedNote } from '../core/import.js';
import { describeMedia } from '../core/media.js';
import { resolveConfigFile, resolveDataFile } from '../storage/paths.js';
import type { ParsedArgs } from './args.js';

/**
 * The one-shot file commands.
 *
 * Runs outside the Ink renderer on purpose: import prints a report, and text
 * written into a live frame tears the display. Doing it here also keeps the
 * whole of this module off the `--help` startup path.
 */

export interface TransferResult {
  code: number;
  lines: string[];
}

const TEXT_EXTENSIONS = new Set(['.csv', '.txt', '.tsv']);

function fail(message: string): TransferResult {
  return { code: 1, lines: [message] };
}

/** 1-based on the command line, 0-based everywhere inside. */
function toFieldIndex(value: number | undefined, fallback: number): number {
  return value === undefined ? fallback : value - 1;
}

export function runImport(args: ParsedArgs, now: Date = new Date()): TransferResult {
  const file = args.file;
  if (!file) {
    return fail('Nothing to import. Try: anki import deck.csv');
  }
  if (!fs.existsSync(file)) {
    return fail(`No such file: ${file}`);
  }

  const extension = path.extname(file).toLowerCase();

  if (extension === '.apkg' || extension === '.colpkg') {
    // Landing next. Saying so beats a confusing parse failure on a zip.
    return fail(
      `Anki package files are not supported yet — only ${[...TEXT_EXTENSIONS].join(', ')}.\n` +
        `For now, open the deck in Anki and use File → Export → Notes in Plain Text.`
    );
  }
  if (!TEXT_EXTENSIONS.has(extension)) {
    return fail(`Don't know how to read ${extension || 'a file with no extension'}: ${file}`);
  }

  let source: string;
  try {
    source = fs.readFileSync(file, 'utf-8');
  } catch (error) {
    return fail(
      `Could not read ${file}: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  const parsed = parseAnkiText(source);
  if (parsed.rows.length === 0) {
    return fail(`${file} has no rows to import.`);
  }

  // The file's own column declarations win over the defaults, because it knows
  // its shape better than we do. Explicit flags win over both.
  const guidColumn = parsed.headers.guidColumn;
  const tagsColumn = parsed.headers.tagsColumn;
  const reserved = new Set([guidColumn, tagsColumn].filter((n): n is number => n !== undefined));
  const contentColumns = [1, 2, 3, 4, 5].filter(column => !reserved.has(column));

  const frontField = toFieldIndex(args.front, (contentColumns[0] ?? 1) - 1);
  const backField = toFieldIndex(args.back, (contentColumns[1] ?? 2) - 1);

  const notes: ImportedNote[] = parsed.rows.map(row => {
    const tags = tagsColumn ? (row.fields[tagsColumn - 1] ?? '').split(/\s+/).filter(Boolean) : [];
    const guid = guidColumn ? row.fields[guidColumn - 1] : undefined;
    return {
      fields: row.fields,
      tags: [...tags, ...parsed.headers.tags],
      ...(guid ? { guid } : {})
    };
  });

  // No sample cards. Seeding is for somebody opening the application for the
  // first time; importing a deck into an empty collection would otherwise
  // silently add five cards about spaced repetition that nobody asked for.
  const store = createStore({ seedSampleCards: false });
  try {
    const existing = selectCards(store.getSnapshot());
    const plan = planImport(notes, existing, {
      frontField,
      backField,
      html: parsed.headers.html,
      ...(args.tag ? { extraTags: [args.tag] } : {}),
      now
    });

    const lines = [`Reading ${file}`, ...describeReport(plan.report)];

    if (plan.report.sample.length > 0) {
      // Printed so a wrong field mapping is obvious now, rather than after
      // three thousand cards are already in the collection.
      lines.push('', 'First cards:');
      for (const card of plan.report.sample) {
        lines.push(`  ${describeMedia(card.front)}  →  ${describeMedia(card.back)}`);
      }
      lines.push('', 'Wrong way round? Re-run with --front and --back.');
    }

    if (args.dryRun) {
      lines.push('', 'Dry run — nothing was written.');
      return { code: 0, lines };
    }

    if (plan.added.length === 0 && plan.updated.length === 0) {
      return { code: 0, lines };
    }

    store.dispatch({ type: 'cards/import', added: plan.added, updated: plan.updated, now });
    store.flush();
    lines.push('', `Saved to ${store.dataFile}`);
    return { code: 0, lines };
  } finally {
    store.dispose();
  }
}

export function runExport(args: ParsedArgs): TransferResult {
  const file = args.file;
  if (!file) {
    return fail('Nowhere to export to. Try: anki export deck.csv');
  }

  const target = path.resolve(file);
  // The one mistake worth guarding: `anki export flashcards.json` would write
  // a text file over the collection it was exporting.
  for (const protectedPath of [resolveDataFile(), resolveConfigFile()]) {
    if (target === path.resolve(protectedPath)) {
      return fail(`Refusing to overwrite your collection at ${protectedPath}.`);
    }
  }

  const store = createStore({ seedSampleCards: false });
  try {
    const cards = selectCards(store.getSnapshot());
    if (cards.length === 0) {
      return fail('Nothing to export — the collection is empty.');
    }

    const rows: ExportRow[] = cards.map(card => ({
      // Exported as text, so an image becomes a readable placeholder rather
      // than a marker that means nothing outside this application.
      front: describeMedia(card.front),
      back: describeMedia(card.back),
      tags: card.tags,
      // A guid the card already has is kept, so exporting and re-importing
      // updates the same cards instead of duplicating them.
      ...(card.guid ? { guid: card.guid } : {})
    }));

    const output = formatAnkiText(rows);
    const temporary = `${target}.${process.pid}.tmp`;
    try {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(temporary, output, 'utf-8');
      fs.renameSync(temporary, target);
    } catch (error) {
      fs.rmSync(temporary, { force: true });
      return fail(
        `Could not write ${target}: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    const withMedia = cards.filter(card => (card.media?.length ?? 0) > 0).length;
    const lines = [`Exported ${cards.length} cards to ${target}`];
    if (withMedia > 0) {
      lines.push(
        `${withMedia} cards reference images, which are named in the text but not copied.`
      );
    }
    lines.push('Import it into Anki with File → Import.');
    return { code: 0, lines };
  } finally {
    store.dispose();
  }
}
