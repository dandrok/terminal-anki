import { imageMarker, isStorableMediaName } from './media.js';

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
  'td',
  'th',
  'dl',
  'dt',
  'dd',
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

/**
 * Named entities, covering Latin-1 and Latin Extended-A.
 *
 * The accented letters are not optional extras: language decks are the most
 * shared kind there is, and without these every French and Spanish card
 * imports reading "caf&eacute;" and "ni&ntilde;o".
 */
const ENTITIES: Record<string, string> = {
  Agrave: 'À',
  Aacute: 'Á',
  Acirc: 'Â',
  Atilde: 'Ã',
  Auml: 'Ä',
  Aring: 'Å',
  AElig: 'Æ',
  Ccedil: 'Ç',
  Egrave: 'È',
  Eacute: 'É',
  Ecirc: 'Ê',
  Euml: 'Ë',
  Igrave: 'Ì',
  Iacute: 'Í',
  Icirc: 'Î',
  Iuml: 'Ï',
  ETH: 'Ð',
  Ntilde: 'Ñ',
  Ograve: 'Ò',
  Oacute: 'Ó',
  Ocirc: 'Ô',
  Otilde: 'Õ',
  Ouml: 'Ö',
  Oslash: 'Ø',
  Ugrave: 'Ù',
  Uacute: 'Ú',
  Ucirc: 'Û',
  Uuml: 'Ü',
  Yacute: 'Ý',
  THORN: 'Þ',
  szlig: 'ß',
  agrave: 'à',
  aacute: 'á',
  acirc: 'â',
  atilde: 'ã',
  auml: 'ä',
  aring: 'å',
  aelig: 'æ',
  ccedil: 'ç',
  egrave: 'è',
  eacute: 'é',
  ecirc: 'ê',
  euml: 'ë',
  igrave: 'ì',
  iacute: 'í',
  icirc: 'î',
  iuml: 'ï',
  eth: 'ð',
  ntilde: 'ñ',
  ograve: 'ò',
  oacute: 'ó',
  ocirc: 'ô',
  otilde: 'õ',
  ouml: 'ö',
  oslash: 'ø',
  ugrave: 'ù',
  uacute: 'ú',
  ucirc: 'û',
  uuml: 'ü',
  yacute: 'ý',
  thorn: 'þ',
  yuml: 'ÿ',
  OElig: 'Œ',
  oelig: 'œ',
  Scaron: 'Š',
  scaron: 'š',
  Yuml: 'Ÿ',
  iexcl: '¡',
  cent: '¢',
  pound: '£',
  curren: '¤',
  yen: '¥',
  brvbar: '¦',
  sect: '§',
  uml: '¨',
  copy: '©',
  ordf: 'ª',
  laquo: '«',
  not: '¬',
  // U+00AD is invisible but real: it would sit inside card text and inside
  // the key used to recognise a card on re-import, matching nothing.
  shy: '',
  reg: '®',
  macr: '¯',
  deg: '°',
  plusmn: '±',
  sup2: '²',
  sup3: '³',
  acute: '´',
  micro: 'µ',
  para: '¶',
  middot: '·',
  cedil: '¸',
  sup1: '¹',
  ordm: 'º',
  raquo: '»',
  frac14: '¼',
  frac12: '½',
  frac34: '¾',
  iquest: '¿',
  times: '×',
  divide: '÷',
  ndash: '–',
  mdash: '—',
  lsquo: '‘',
  rsquo: '’',
  sbquo: '‚',
  ldquo: '“',
  rdquo: '”',
  bdquo: '„',
  dagger: '†',
  Dagger: '‡',
  bull: '•',
  hellip: '…',
  permil: '‰',
  prime: '′',
  Prime: '″',
  lsaquo: '‹',
  rsaquo: '›',
  oline: '‾',
  frasl: '⁄',
  euro: '€',
  trade: '™',
  larr: '←',
  uarr: '↑',
  rarr: '→',
  darr: '↓',
  harr: '↔',
  minus: '−',
  lowast: '∗',
  radic: '√',
  infin: '∞',
  ne: '≠',
  le: '≤',
  ge: '≥',
  asymp: '≈',
  equiv: '≡',
  alpha: 'α',
  beta: 'β',
  gamma: 'γ',
  delta: 'δ',
  epsilon: 'ε',
  theta: 'θ',
  lambda: 'λ',
  mu: 'μ',
  pi: 'π',
  sigma: 'σ',
  phi: 'φ',
  omega: 'ω',
  Alpha: 'Α',
  Beta: 'Β',
  Gamma: 'Γ',
  Delta: 'Δ',
  Theta: 'Θ',
  Lambda: 'Λ',
  Pi: 'Π',
  Sigma: 'Σ',
  Phi: 'Φ',
  Omega: 'Ω',
  nbsp: ' ',
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  '#39': "'"
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
      if (
        !Number.isFinite(code) ||
        code <= 0 ||
        code > 0x10ffff ||
        (code >= 0xd800 && code <= 0xdfff)
      ) {
        return whole;
      }
      // The numeric forms of the soft hyphen go the same way as `&shy;`:
      // U+00AD is invisible but real, and would sit inside card text and
      // inside the key used to recognise a card on re-import.
      return code === 0x00ad ? '' : String.fromCodePoint(code);
    }
    return ENTITIES[body] ?? whole;
  });
}

/**
 * Read one attribute out of a tag's attribute string.
 *
 * The name has to start the string or follow whitespace. Without that, asking
 * for `src` matched inside `data-src` — and a lazy-loading deck writes
 * `<img data-src="placeholder.png" src="real.png">`, so the wrong file won.
 */
function attribute(attributes: string, name: string): string | undefined {
  const boundary = `(?:^|\\s)${name}\\s*=\\s*`;
  const quoted = new RegExp(`${boundary}("([^"]*)"|'([^']*)')`, 'i').exec(attributes);
  if (quoted) {
    return quoted[2] ?? quoted[3];
  }
  const bare = new RegExp(`${boundary}([^\\s>]+)`, 'i').exec(attributes);
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
  output = output.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '');
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
        // A name the parser would refuse is dropped here instead, so the
        // reported images and the markers in the text always agree.
        if (!resolved || !isStorableMediaName(resolved)) {
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
