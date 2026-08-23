/**
 * Anki's text import/export format.
 *
 * Deliberately Anki's format rather than one of our own, so a single file works
 * in both applications: export here and import in Anki desktop, or the reverse,
 * with no converter in between.
 *
 * The format is delimited columns with an optional `#key:value` header block:
 *
 * ```
 * #separator:tab
 * #html:false
 * #tags column:3
 * What is the capital of France?	Paris	geography europe
 * ```
 */

/** Separator names Anki writes in a `#separator:` header. */
const SEPARATOR_NAMES: Record<string, string> = {
  tab: '\t',
  comma: ',',
  semicolon: ';',
  space: ' ',
  pipe: '|',
  colon: ':'
};

/** Tab first: it is Anki's own default and needs no quoting for prose. */
export const DEFAULT_SEPARATOR = '\t';

export interface AnkiTextHeaders {
  separator: string;
  /** Whether fields should be treated as HTML rather than literal text. */
  html: boolean;
  /** 1-based column holding tags, when the file declares one. */
  tagsColumn?: number;
  /** 1-based column holding the note GUID, when the file declares one. */
  guidColumn?: number;
  /** Tags applied to every row in the file. */
  tags: string[];
  deck?: string;
  notetype?: string;
}

export interface AnkiTextRow {
  fields: string[];
  /** Line number in the source file, for error messages. */
  line: number;
}

export interface AnkiTextFile {
  headers: AnkiTextHeaders;
  rows: AnkiTextRow[];
}

/**
 * Resolve a `#separator:` value.
 *
 * Anki accepts both names (`Tab`) and literal characters (`\t`, `;`), and is
 * case-insensitive about the names.
 */
export function resolveSeparator(value: string): string {
  const named = SEPARATOR_NAMES[value.trim().toLowerCase()];
  if (named) {
    return named;
  }
  if (value === '\\t') {
    return '\t';
  }
  // A literal single character, which is how Anki writes anything unnamed.
  return value.length === 1 ? value : DEFAULT_SEPARATOR;
}

/**
 * Guess the separator from the body when the file does not declare one.
 *
 * Counts columns on the first few records and takes the candidate that gives
 * the same count on every one — a separator produces a consistent column count,
 * while a character that merely occurs in the prose does not.
 *
 * Counted with the same quote-aware scanner the parser uses, not by splitting.
 * A field like `"Paris, France"` contains a comma that is not a separator, and
 * splitting on it made a tab-separated file look like a comma-separated one.
 */
export function detectSeparator(lines: readonly string[]): string {
  const body = lines.filter(line => !line.startsWith('#'));

  let best = DEFAULT_SEPARATOR;
  let bestColumns = 0;

  for (const candidate of ['\t', ';', ',', '|']) {
    const counts = recordFieldCounts(body, candidate).slice(0, 20);
    const first = counts[0];
    if (counts.length > 0 && first > 1 && counts.every(count => count === first)) {
      if (first > bestColumns) {
        best = candidate;
        bestColumns = first;
      }
    }
  }

  return best;
}

/** How many fields each complete record has, under one candidate separator. */
function recordFieldCounts(lines: readonly string[], separator: string): number[] {
  const counts: number[] = [];
  let carry: OpenRow | undefined;

  for (const line of lines) {
    if (!carry && line.trim() === '' && !line.includes(separator)) {
      continue;
    }
    const scanned = scanRow(line, separator, carry);
    if (scanned.open) {
      carry = { fields: scanned.fields, field: scanned.field };
      continue;
    }
    counts.push(scanned.fields.length);
    carry = undefined;
  }

  return counts;
}

/** A row part-read: the fields completed so far, plus the one still open. */
interface OpenRow {
  fields: string[];
  field: string;
}

/**
 * Scan one line, honouring RFC 4180 quoting.
 *
 * Continues an open quoted field when `carry` is given, which is how a field
 * containing a newline is read: it spans lines, and the row is not finished
 * until the quote closes.
 *
 * One scanner rather than three. Splitting a fresh line, opening a field and
 * continuing one are the same walk from a different starting state, and three
 * copies meant three chances for the quoting rules to drift apart.
 */
function scanRow(
  line: string,
  separator: string,
  carry?: OpenRow
): { fields: string[]; field: string; open: boolean } {
  const fields = carry ? [...carry.fields] : [];
  let field = carry ? carry.field : '';
  let quoted = carry !== undefined;
  let index = 0;

  while (index < line.length) {
    const character = line[index];

    if (quoted) {
      if (character === '"') {
        // A doubled quote inside a quoted field is one literal quote.
        if (line[index + 1] === '"') {
          field += '"';
          index += 2;
          continue;
        }
        quoted = false;
        index++;
        continue;
      }
      field += character;
      index++;
      continue;
    }

    // A quote only opens a field at its start; elsewhere it is just a quote.
    if (character === '"' && field.length === 0) {
      quoted = true;
      index++;
      continue;
    }
    if (line.startsWith(separator, index)) {
      fields.push(field);
      field = '';
      index += separator.length;
      continue;
    }

    field += character;
    index++;
  }

  if (quoted) {
    // The newline this line ended on is part of the field.
    return { fields, field: `${field}\n`, open: true };
  }
  fields.push(field);
  return { fields, field: '', open: false };
}

/** Parse the `#key: value` header block and the delimited body. */
export function parseAnkiText(source: string): AnkiTextFile {
  // Strip a UTF-8 BOM: a spreadsheet export starts with one, and it would
  // otherwise become part of the first header key.
  const lines = source.replace(/^\uFEFF/, '').split(/\r\n?|\n/);

  const headers: AnkiTextHeaders = {
    separator: '',
    html: false,
    tags: []
  };

  let index = 0;
  for (; index < lines.length; index++) {
    const line = lines[index];
    if (!line.startsWith('#')) {
      break;
    }
    const at = line.indexOf(':');
    if (at < 0) {
      continue;
    }
    const key = line.slice(1, at).trim().toLowerCase();
    const value = line.slice(at + 1).trim();

    switch (key) {
      case 'separator':
        headers.separator = resolveSeparator(value);
        break;
      case 'html':
        headers.html = value.toLowerCase() === 'true';
        break;
      case 'tags':
        headers.tags = value.split(/\s+/).filter(Boolean);
        break;
      case 'deck':
        headers.deck = value;
        break;
      case 'notetype':
        headers.notetype = value;
        break;
      case 'tags column':
        headers.tagsColumn = Number.parseInt(value, 10) || undefined;
        break;
      case 'guid column':
        headers.guidColumn = Number.parseInt(value, 10) || undefined;
        break;
      default:
        // Unknown headers are ignored rather than rejected: Anki adds new ones
        // over time and a file we cannot fully describe is still importable.
        break;
    }
  }

  const body = lines.slice(index);
  const separator = headers.separator || detectSeparator(body);
  headers.separator = separator;

  const rows: AnkiTextRow[] = [];
  let carry: OpenRow | undefined;
  let carryLine = 0;

  for (let offset = 0; offset < body.length; offset++) {
    const line = body[offset];
    // Blank lines are spacing, but a line made only of separators is a real row
    // whose fields happen to be empty. Trimming alone dropped it, which lost a
    // row without saying so — the import layer should decide it is empty and
    // report it, not the parser.
    if (!carry && line.trim() === '' && !line.includes(separator)) {
      continue;
    }
    if (!carry) {
      carryLine = index + offset + 1;
    }

    const scanned = scanRow(line, separator, carry);
    if (scanned.open) {
      carry = { fields: scanned.fields, field: scanned.field };
      continue;
    }
    rows.push({ fields: scanned.fields, line: carryLine });
    carry = undefined;
  }

  // A field left open at end of file is still worth keeping; dropping the row
  // would silently lose a card because of one unbalanced quote.
  if (carry) {
    rows.push({ fields: [...carry.fields, carry.field], line: carryLine });
  }

  return { headers, rows };
}

/** Quote a field only when the separator, a quote or a newline forces it. */
export function quoteField(value: string, separator: string): string {
  const needsQuotes =
    value.includes(separator) ||
    value.includes('"') ||
    value.includes('\n') ||
    value.includes('\r');
  return needsQuotes ? `"${value.replace(/"/g, '""')}"` : value;
}

export interface FormatOptions {
  separator?: string;
  /** Emitted as a `#deck:` header so Anki files the notes somewhere sensible. */
  deck?: string;
}

export interface ExportRow {
  front: string;
  back: string;
  tags: readonly string[];
  guid?: string;
}

/**
 * Write rows in Anki's text format.
 *
 * The header block is always written. Anki can auto-detect a separator, but
 * declaring it removes the guesswork — and `#html:false` matters: without it a
 * card whose text contains a `<` can be silently reinterpreted as markup.
 */
export function formatAnkiText(rows: readonly ExportRow[], options: FormatOptions = {}): string {
  const separator = options.separator ?? DEFAULT_SEPARATOR;
  const separatorName =
    Object.entries(SEPARATOR_NAMES).find(([, value]) => value === separator)?.[0] ?? separator;

  // The guid column only earns its place when something is in it. A deck of
  // hand-typed cards exports as three plain columns rather than leading every
  // single line with an empty one.
  const withGuids = rows.some(row => row.guid);

  const lines = [`#separator:${separatorName}`, '#html:false'];
  if (withGuids) {
    lines.push('#guid column:1');
  }
  lines.push(`#tags column:${withGuids ? 4 : 3}`);
  if (options.deck) {
    lines.push(`#deck:${options.deck}`);
  }

  for (const row of rows) {
    const fields = withGuids ? [quoteField(row.guid ?? '', separator)] : [];
    fields.push(
      quoteField(row.front, separator),
      quoteField(row.back, separator),
      // Anki separates tags with spaces, so a tag cannot contain one.
      quoteField(row.tags.join(' '), separator)
    );
    lines.push(fields.join(separator));
  }

  return `${lines.join('\n')}\n`;
}
