import { describe, expect, it } from 'vitest';
import {
  isStorableMediaName,
  describeMedia,
  hasMedia,
  imageMarker,
  mediaOf,
  parseSegments,
  stripMedia
} from '../../src/core/media.js';

const marker = (file: string) => `\u27E6img:${file}\u27E7`;

describe('imageMarker', () => {
  it('wraps a filename in delimiters no deck would write', () => {
    expect(imageMarker('a.png')).toBe(marker('a.png'));
  });

  it('round-trips through parseSegments', () => {
    expect(parseSegments(imageMarker('a.png'))).toEqual([{ kind: 'image', file: 'a.png' }]);
  });
});

describe('parseSegments', () => {
  it('returns one text segment for plain text', () => {
    expect(parseSegments('hello')).toEqual([{ kind: 'text', value: 'hello' }]);
  });

  it('always returns at least one segment, even for empty input', () => {
    // So callers can render without special-casing.
    expect(parseSegments('')).toEqual([{ kind: 'text', value: '' }]);
  });

  it('keeps an image in the middle of a sentence where it belongs', () => {
    expect(parseSegments(`The valve ${marker('h.png')} sits here`)).toEqual([
      { kind: 'text', value: 'The valve ' },
      { kind: 'image', file: 'h.png' },
      { kind: 'text', value: ' sits here' }
    ]);
  });

  it('handles an image at each end', () => {
    expect(parseSegments(`${marker('a.png')}${marker('b.png')}`)).toEqual([
      { kind: 'image', file: 'a.png' },
      { kind: 'image', file: 'b.png' }
    ]);
  });

  it('is not stateful across calls', () => {
    // The marker regex is module-level and global; an exec loop would carry
    // lastIndex between calls and start the next parse partway through.
    const input = `x${marker('a.png')}y`;
    expect(parseSegments(input)).toEqual(parseSegments(input));
  });

  it('drops a marker whose filename could escape the media directory', () => {
    // Dropped, but still one segment: the "never empty" contract above is what
    // lets renderers skip a special case, so the rejection must not break it.
    expect(parseSegments(marker('../../etc/passwd'))).toEqual([{ kind: 'text', value: '' }]);
    expect(parseSegments(marker('/etc/passwd'))).toEqual([{ kind: 'text', value: '' }]);
    expect(parseSegments(`a${marker('../x')}b`)).toEqual([
      { kind: 'text', value: 'a' },
      { kind: 'text', value: 'b' }
    ]);
  });

  it('leaves an unclosed marker as text', () => {
    expect(parseSegments('\u27E6img:a.png')).toEqual([{ kind: 'text', value: '\u27E6img:a.png' }]);
  });
});

describe('isStorableMediaName', () => {
  it.each(['a.png', 'ab12cd34.png', 'a-b_c.jpeg'])('accepts %j', name => {
    expect(isStorableMediaName(name)).toBe(true);
  });

  it.each(['.', '..'])('rejects the path component %j', name => {
    // These pass the character test but are not files, and the marker writer
    // and reader have to agree on exactly one rule.
    expect(isStorableMediaName(name)).toBe(false);
  });

  it.each(['../x.png', '/etc/passwd', 'a b.png', 'a&b.png', ''])('rejects %j', name => {
    expect(isStorableMediaName(name)).toBe(false);
  });
});

describe('mediaOf', () => {
  it('collects across fields without duplicates', () => {
    expect(mediaOf(`a${marker('x.png')}`, `b${marker('x.png')}${marker('y.png')}`)).toEqual([
      'x.png',
      'y.png'
    ]);
  });

  it('is empty when nothing references media', () => {
    expect(mediaOf('a', 'b')).toEqual([]);
  });
});

describe('hasMedia', () => {
  it.each([
    [`a${marker('x.png')}`, true],
    ['plain', false],
    ['', false]
  ])('%j -> %s', (input, expected) => {
    expect(hasMedia(input)).toBe(expected);
  });
});

describe('describeMedia', () => {
  it('names the file where the image would be', () => {
    expect(describeMedia(`See ${marker('heart.png')} here`)).toBe('See [image: heart.png] here');
  });

  it('leaves text without media untouched', () => {
    expect(describeMedia('plain')).toBe('plain');
  });
});

describe('stripMedia', () => {
  it('removes markers for search and sorting', () => {
    expect(stripMedia(`The valve ${marker('h.png')} sits here`)).toBe('The valve  sits here');
  });

  it('trims what is left', () => {
    expect(stripMedia(marker('h.png'))).toBe('');
  });
});
