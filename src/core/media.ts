/**
 * Media references inside card text.
 *
 * An imported field is not plain text: an Anki note can put an image in the
 * middle of a sentence, and where it sits matters. Rather than lifting media
 * into a separate list and losing the position, a reference is left inline as a
 * marker and split back out at render time.
 *
 * The delimiters are U+27E6/U+27E7 mathematical white square brackets, chosen
 * because no deck writes them and no shell mangles them, so a marker cannot be
 * produced by accident from ordinary card text.
 */
const OPEN = '⟦';
const CLOSE = '⟧';

/** Matches a marker and captures the stored filename. */
const MARKER = new RegExp(`${OPEN}img:([^${CLOSE}]+)${CLOSE}`, 'g');

/** Filenames are stored hashed, so this only has to survive a round trip. */
const SAFE_NAME = /^[A-Za-z0-9._-]+$/;

/**
 * Whether a filename can be carried in a marker.
 *
 * Exported so whatever *writes* a marker uses the same rule that reads one.
 * When they disagreed, `htmlToText` happily emitted a marker for "my photo.png"
 * and the parser then dropped it — the picture disappeared with nothing said
 * and nothing listed in the card's media.
 */
export function isStorableMediaName(name: string): boolean {
  // "." and ".." pass the character test but are path components, not files.
  if (name === '.' || name === '..') {
    return false;
  }
  return SAFE_NAME.test(name);
}

export interface TextSegment {
  kind: 'text';
  value: string;
}

export interface ImageSegment {
  kind: 'image';
  /** Filename inside the media directory. */
  file: string;
}

export type CardSegment = TextSegment | ImageSegment;

/** Build the marker for a stored media file. */
export function imageMarker(file: string): string {
  return `${OPEN}img:${file}${CLOSE}`;
}

/**
 * Split a field into text and image runs, in order.
 *
 * Always returns at least one segment so a caller can render the result without
 * special-casing empty input.
 */
export function parseSegments(text: string): CardSegment[] {
  const segments: CardSegment[] = [];
  let index = 0;
  let sawMarker = false;

  // `matchAll` rather than a stateful `exec` loop: MARKER is a module-level
  // regex with the global flag, and `exec` would carry `lastIndex` between
  // calls and start the next parse partway through the string.
  for (const match of text.matchAll(MARKER)) {
    sawMarker = true;
    const at = match.index;
    if (at > index) {
      segments.push({ kind: 'text', value: text.slice(index, at) });
    }
    // A name that could climb out of the media directory is dropped whole,
    // rather than kept as an image or handed back as text.
    if (isStorableMediaName(match[1])) {
      segments.push({ kind: 'image', file: match[1] });
    }
    index = at + match[0].length;
  }

  if (index < text.length) {
    segments.push({ kind: 'text', value: text.slice(index) });
  }

  if (segments.length > 0) {
    return segments;
  }
  // Never empty, as documented above. Input with no markers gives back its own
  // text; input that was nothing but a rejected marker gives back an empty
  // string rather than the marker, which is the whole point of rejecting it.
  return [{ kind: 'text', value: sawMarker ? '' : text }];
}

/** Every media file a field refers to, in order, without duplicates. */
export function mediaOf(...fields: string[]): string[] {
  const seen = new Set<string>();
  for (const field of fields) {
    for (const segment of parseSegments(field)) {
      if (segment.kind === 'image') {
        seen.add(segment.file);
      }
    }
  }
  return [...seen];
}

/** True when a field carries at least one image. */
export function hasMedia(text: string): boolean {
  return parseSegments(text).some(segment => segment.kind === 'image');
}

/**
 * The field with its markers replaced by a readable placeholder.
 *
 * Used wherever an image cannot be drawn — a narrow list row, a terminal with
 * no graphics support, or a CSV export.
 */
export function describeMedia(text: string): string {
  return parseSegments(text)
    .map(segment => (segment.kind === 'text' ? segment.value : `[image: ${segment.file}]`))
    .join('');
}

/** The field with its markers removed entirely, for search and sorting. */
export function stripMedia(text: string): string {
  return parseSegments(text)
    .filter((segment): segment is TextSegment => segment.kind === 'text')
    .map(segment => segment.value)
    .join('')
    .trim();
}
