import { htmlToText, isCloze, looksLikeHtml, stripSounds } from './html.js';
import { normalizeTags } from './filters.js';
import { initialSchedulingState } from './sm2.js';
import { createId } from './ids.js';
import { hasMedia, mediaOf, stripMedia } from './media.js';
import type { Flashcard } from '../types/index.js';

/**
 * Turning somebody else's deck into ours.
 *
 * Shared by every import source, so `.apkg` and a text file cannot drift into
 * disagreeing about what counts as a duplicate or how a field becomes a card.
 * Pure: the caller reads the file and writes the result, this only decides.
 */

/** One note as it arrived, before it is anything of ours. */
export interface ImportedNote {
  /** Field values in the note's own order. */
  fields: string[];
  tags: string[];
  /** Anki's note GUID, when the source has one. Makes re-import idempotent. */
  guid?: string;
  /** How many cards Anki would generate. >1 means a reverse card exists. */
  cardCount?: number;
  /**
   * The deck this note sits in, which becomes a tag.
   *
   * Per note rather than per file: a package holds a deck tree, and tagging
   * every note with the first deck name found labelled cards that were
   * nowhere near it.
   */
  deck?: string;
  /** Scheduling carried over from the source, when it has any. */
  scheduling?: Partial<Pick<Flashcard, 'easiness' | 'interval' | 'repetitions' | 'nextReview'>>;
}

export interface ImportOptions {
  /** 0-based field index for the question. */
  frontField?: number;
  /** 0-based field index for the answer. */
  backField?: number;
  /** Applied to every card, on top of the note's own tags. */
  extraTags?: readonly string[];
  /** Fields are HTML and need converting. Text files may say otherwise. */
  html?: boolean;
  /** Map a source media filename to its stored name. */
  resolveMedia?: (name: string) => string | undefined;
  now?: Date;
}

export interface ImportReport {
  /** Notes read from the source, before any were rejected. */
  read: number;
  added: number;
  updated: number;
  /** Already present, matched by guid or by front text. */
  duplicates: number;
  skippedCloze: number;
  skippedEmpty: number;
  /** Notes whose reverse card was not generated. */
  reverseNotCreated: number;
  /** Audio references dropped, which we do not support. */
  soundsDropped: number;
  media: string[];
  /** First few results, so a wrong field mapping is visible before committing. */
  sample: Flashcard[];
}

export interface ImportPlan {
  /** Brand new cards to append. */
  added: Flashcard[];
  /** Existing cards to replace, matched by guid. Scheduling is preserved. */
  updated: Flashcard[];
  report: ImportReport;
}

const SAMPLE_SIZE = 3;

/** How a card is recognised again when it has no guid. */
function frontKey(front: string): string {
  return stripMedia(front).trim().toLowerCase().replace(/\s+/g, ' ');
}

function emptyReport(): ImportReport {
  return {
    read: 0,
    added: 0,
    updated: 0,
    duplicates: 0,
    skippedCloze: 0,
    skippedEmpty: 0,
    reverseNotCreated: 0,
    soundsDropped: 0,
    media: [],
    sample: []
  };
}

/**
 * Decide what an import would do, without doing any of it.
 *
 * Returning a plan rather than mutating means `--dry-run` is the same code path
 * as a real import, so what it reports is exactly what would happen.
 */
export function planImport(
  notes: readonly ImportedNote[],
  existing: readonly Flashcard[],
  options: ImportOptions = {}
): ImportPlan {
  const {
    frontField = 0,
    backField = 1,
    extraTags = [],
    html = true,
    resolveMedia,
    now = new Date()
  } = options;

  const report = emptyReport();
  const added: Flashcard[] = [];
  const updated: Flashcard[] = [];
  const media = new Set<string>();

  const byGuid = new Map<string, Flashcard>();
  const byFront = new Map<string, Flashcard>();
  for (const card of existing) {
    if (card.guid) {
      byGuid.set(card.guid, card);
    }
    byFront.set(frontKey(card.front), card);
  }

  // Within one file too: a deck can repeat a note, and importing it twice in
  // the same run would be just as wrong as importing it twice across runs.
  const seenGuid = new Set<string>();
  const seenFront = new Set<string>();

  const convert = (value: string): string => {
    // Audio comes out either way: `[sound:…]` is Anki's own syntax rather than
    // markup, so a plain-text field carrying one would otherwise keep the
    // filename as visible junk in the middle of a sentence.
    const { text, sounds } = stripSounds(value);
    report.soundsDropped += sounds.length;

    if (!html || !looksLikeHtml(text)) {
      return text.trim();
    }
    const result = htmlToText(text, resolveMedia ? { resolveMedia } : {});
    return result.text;
  };

  for (const note of notes) {
    report.read++;

    const rawFront = note.fields[frontField] ?? '';
    const rawBack = note.fields[backField] ?? '';

    // Checked before conversion: the cloze markers live in the source text and
    // htmlToText would leave them intact but harder to spot.
    if (isCloze(rawFront) || isCloze(rawBack)) {
      report.skippedCloze++;
      continue;
    }

    const front = convert(rawFront);
    const back = convert(rawBack);

    // A card needs both halves, but a half made only of an image is a real
    // one — plenty of decks ask "what is this?" with nothing but a picture.
    const isBlank = (value: string) => stripMedia(value) === '' && !hasMedia(value);
    if (isBlank(front) || isBlank(back)) {
      report.skippedEmpty++;
      continue;
    }

    if ((note.cardCount ?? 1) > 1) {
      report.reverseNotCreated++;
    }

    const key = frontKey(front);
    if ((note.guid && seenGuid.has(note.guid)) || (!note.guid && seenFront.has(key))) {
      report.duplicates++;
      continue;
    }
    if (note.guid) {
      seenGuid.add(note.guid);
    }
    seenFront.add(key);

    const tags = normalizeTags([...note.tags, ...(note.deck ? [note.deck] : []), ...extraTags]);
    const files = mediaOf(front, back);
    for (const file of files) {
      media.add(file);
    }

    const match = note.guid ? byGuid.get(note.guid) : byFront.get(key);

    if (match) {
      if (!note.guid) {
        // Matched only on text: treat it as already present rather than
        // overwriting a card the learner may have edited themselves.
        report.duplicates++;
        continue;
      }
      // Content is replaced; scheduling is not. Re-importing an updated deck
      // must not throw away the progress made on the card so far.
      updated.push({
        ...match,
        front,
        back,
        tags,
        ...(files.length > 0 ? { media: files } : {}),
        guid: note.guid
      });
      report.updated++;
      if (report.sample.length < SAMPLE_SIZE) {
        // Updates get sampled as well, or a re-import that only refreshes
        // existing cards would print no preview at all.
        report.sample.push(updated[updated.length - 1]);
      }
      continue;
    }

    const card: Flashcard = {
      id: createId(),
      front,
      back,
      tags,
      ...initialSchedulingState(now),
      ...note.scheduling,
      createdAt: now,
      ...(note.guid ? { guid: note.guid } : {}),
      ...(files.length > 0 ? { media: files } : {})
    };

    added.push(card);
    report.added++;
    if (report.sample.length < SAMPLE_SIZE) {
      report.sample.push(card);
    }
  }

  report.media = [...media];
  return { added, updated, report };
}

/**
 * Merge an import into a card list.
 *
 * Updated cards are replaced where they already sit rather than moved to the
 * end, so re-importing a deck does not reshuffle a browse list the learner has
 * got used to. Lives here rather than in the reducer so the planner and the
 * state layer cannot disagree about what a plan means.
 */
export function mergeImport(
  existing: readonly Flashcard[],
  added: readonly Flashcard[],
  updated: readonly Flashcard[]
): Flashcard[] {
  if (updated.length === 0) {
    return [...existing, ...added];
  }
  const replacements = new Map(updated.map(card => [card.id, card]));
  return [...existing.map(card => replacements.get(card.id) ?? card), ...added];
}

/** Convenience wrapper for a whole plan. */
export function applyImport(existing: readonly Flashcard[], plan: ImportPlan): Flashcard[] {
  return mergeImport(existing, plan.added, plan.updated);
}

/** One-line-per-fact summary, for the terminal after an import. */
export function describeReport(report: ImportReport): string[] {
  const lines = [`Read ${report.read} notes.`];

  const outcome: string[] = [];
  if (report.added > 0) {
    outcome.push(`${report.added} added`);
  }
  if (report.updated > 0) {
    outcome.push(`${report.updated} updated`);
  }
  if (report.duplicates > 0) {
    outcome.push(`${report.duplicates} already present`);
  }
  lines.push(outcome.length > 0 ? outcome.join(', ') + '.' : 'Nothing to add.');

  // Everything below is a thing the import could not do. Reported explicitly
  // rather than left for the learner to discover a missing card later.
  if (report.skippedCloze > 0) {
    lines.push(`${report.skippedCloze} cloze notes skipped — cloze cards are not supported.`);
  }
  if (report.reverseNotCreated > 0) {
    lines.push(`${report.reverseNotCreated} notes had a reverse card that was not created.`);
  }
  if (report.skippedEmpty > 0) {
    lines.push(`${report.skippedEmpty} notes skipped for having no front or no back.`);
  }
  if (report.soundsDropped > 0) {
    lines.push(`${report.soundsDropped} audio references dropped — audio is not supported.`);
  }
  if (report.media.length > 0) {
    lines.push(`${report.media.length} media files referenced.`);
  }

  return lines;
}
