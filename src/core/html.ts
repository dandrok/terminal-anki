import { imageMarker } from './media.js';

/**
 * Turn an Anki field into plain text.
 *
 * Fields in a shared deck are HTML, not text. Anki's editor writes `<div>` per
 * line, `<br>` for soft breaks, `&nbsp;` for spacing, and `<img>` for media —
 * so importing a real deck without this step gives you tag soup on every card.
 *
 * Deliberately not an HTML parser. The input is one field of editor-produced
 * markup, not a document: there is no scripting, no CSS, and nothing to lay
 * out. A parser would be far more code for output no better than this, and
 * would still have to make the same judgement calls about which tags imply a
 * line break.
 */

/**
 * Marks a block boundary before whitespace is normalised.
 *
 * Block tags cannot emit "\n" directly: `</div><div>` would then produce two
 * newlines and every pair of adjacent lines would come out double-spaced. The
 * sentinel lets a run of adjacent boundaries collapse to a single break, while
 * a `<br>` between them survives as a genuine blank line — which is exactly how
 * Anki's editor writes one (`<div><br></div>`).
 */
const BLOCK_BREAK = '\u0000';

/**
 * Built from the constant rather than written inline.
 *
 * A NUL is the one character card text cannot contain, which is exactly what a
 * sentinel needs — and deriving the patterns here keeps the sentinel to a
 * single definition instead of repeating a control character in two regexes.
 */
const BLOCK_BREAK_RUN = new RegExp(`${BLOCK_BREAK}[^\\S\\n]*(?=${BLOCK_BREAK})`, 'g');
const BLOCK_BREAK_ALL = new RegExp(BLOCK_BREAK, 'g');

/** Tags that start a new line when they open or close. */
const BLOCK_TAGS = new Set([
  'div',
  'p',
  'li',
  'ul',
  'ol',
  'tr',
  'table',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'blockquote',
  'pre',
  'section',
  'article',
  'header',
  'footer'
]);

/** Named entities Anki's editor actually emits. */
const ENTITIES: Record<string, string> = {
  // A plain space, not U+00A0: a real non-breaking space would defeat Ink's
  // word wrapping and measure oddly in some terminals.
  nbsp: ' ',
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  '#39': "'",
  hellip: '…',
  mdash: '—',
  ndash: '–',
  laquo: '«',
  raquo: '»',
  deg: '°',
  times: '×',
  divide: '÷',
  rsquo: '’',
  lsquo: '‘',
  ldquo: '“',
  rdquo: '”'
};

export interface HtmlToTextResult {
  text: string;
  /** Media filenames referenced by `<img src>`, in document order. */
  images: string[];
  /** `[sound:…]` references found. Audio is not supported, only counted. */
  sounds: string[];
}

export interface HtmlToTextOptions {
  /**
   * Map an Anki media filename to the name it was stored under. Returning
   * `undefined` drops the image, which is what happens when a deck references
   * a file it did not ship.
   */
  resolveMedia?: (name: string) => string | undefined;
}

/** Decode the entity forms Anki produces, including numeric ones. */
export function decodeEntities(input: string): string {
  return input.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g, (whole, body: string) => {
    if (body.startsWith('#')) {
      const isHex = body[1] === 'x' || body[1] === 'X';
      const code = Number.parseInt(isHex ? body.slice(2) : body.slice(1), isHex ? 16 : 10);
      // Lone surrogates and out-of-range values would produce broken output;
      // leaving the entity as written is more useful than a replacement char.
      return Number.isFinite(code) &&
        code > 0 &&
        code <= 0x10ffff &&
        !(code >= 0xd800 && code <= 0xdfff)
        ? String.fromCodePoint(code)
        : whole;
    }
    return ENTITIES[body] ?? whole;
  });
}

/** Read one attribute out of a tag's attribute string. */
function attribute(attributes: string, name: string): string | undefined {
  const quoted = new RegExp(`${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i').exec(attributes);
  if (quoted) {
    return quoted[2] ?? quoted[3];
  }
  const bare = new RegExp(`${name}\\s*=\\s*([^\\s>]+)`, 'i').exec(attributes);
  return bare?.[1];
}

/**
 * Collapse the whitespace HTML would have collapsed.
 *
 * Runs of spaces become one, runs of blank lines become one, and trailing
 * spaces on a line go — otherwise every card imported from Anki's editor
 * carries the indentation of its source markup.
 */
function tidy(text: string): string {
  return (
    text
      .replace(/\r\n?/g, '\n')
      // Collapse a run of adjacent block boundaries to one, then make them real.
      .replace(BLOCK_BREAK_RUN, '')
      .replace(BLOCK_BREAK_ALL, '\n')
      .replace(/[^\S\n]+/g, ' ')
      .replace(/ *\n */g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  );
}

/**
 * Remove Anki's `[sound:…]` references, returning what was found.
 *
 * Separate from `htmlToText` because it has to run whether or not the field is
 * HTML: the syntax is Anki's own, not markup, so a plain-text field carrying
 * one would otherwise keep the filename as visible junk mid-sentence.
 */
export function stripSounds(input: string): { text: string; sounds: string[] } {
  const sounds: string[] = [];
  // The surrounding spaces come too, collapsing to one only when there was
  // whitespace on both sides. Removing just the reference left "Say  this"
  // with a double space in the middle of every audio card.
  const text = input.replace(
    /([^\S\n]*)\[sound:([^\]]*)\]([^\S\n]*)/g,
    (_whole, before: string, name: string, after: string) => {
      sounds.push(name);
      return before && after ? ' ' : '';
    }
  );
  return { text, sounds };
}

export function htmlToText(input: string, options: HtmlToTextOptions = {}): HtmlToTextResult {
  const images: string[] = [];

  const stripped = stripSounds(input);
  const sounds = stripped.sounds;
  let output = stripped.text;

  // Script and style content is not card text; drop the whole element rather
  // than stripping the tags and leaving the code behind as prose.
  output = output.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '');
  output = output.replace(/<!--[\s\S]*?-->/g, '');

  output = output.replace(
    /<([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>|<\/([a-zA-Z][a-zA-Z0-9]*)\s*>/g,
    (
      _whole,
      openName: string | undefined,
      attributes: string | undefined,
      closeName: string | undefined
    ) => {
      const name = (openName ?? closeName ?? '').toLowerCase();

      if (name === 'img' && openName) {
        const source = attribute(attributes ?? '', 'src');
        if (!source) {
          return '';
        }
        const decoded = decodeEntities(source);
        const resolved = options.resolveMedia ? options.resolveMedia(decoded) : decoded;
        if (!resolved) {
          return '';
        }
        images.push(resolved);
        return imageMarker(resolved);
      }

      if (name === 'br') {
        return '\n';
      }
      if (BLOCK_TAGS.has(name)) {
        return BLOCK_BREAK;
      }
      // Inline formatting (b, i, u, span, font, a…) leaves the text in place.
      return '';
    }
  );

  // Any leftover `<` that was not part of a tag — a maths field writing `a < b`
  // survives this way instead of being eaten as an unclosed tag.
  return { text: tidy(decodeEntities(output)), images, sounds };
}

/** True when a field looks like it contains markup worth converting. */
export function looksLikeHtml(input: string): boolean {
  return /<[a-zA-Z/!]|&[a-zA-Z#][a-zA-Z0-9]*;/.test(input);
}

/**
 * Anki's cloze syntax, which we detect but do not support.
 *
 * A cloze note has no front and back to import: the card is the sentence with
 * one deletion hidden, and one note produces a card per deletion. Turning it
 * into a front/back pair would produce something that is not the card the
 * author wrote.
 */
export function isCloze(text: string): boolean {
  return /\{\{c\d+::/.test(text);
}
