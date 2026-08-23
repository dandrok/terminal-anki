import { describe, expect, it } from 'vitest';
import { decodeEntities, htmlToText, isCloze, looksLikeHtml } from '../../src/core/html.js';

const text = (input: string, resolveMedia?: (name: string) => string | undefined) =>
  htmlToText(input, resolveMedia ? { resolveMedia } : {}).text;

describe('decodeEntities', () => {
  it.each([
    ['&amp;', '&'],
    ['&lt;a&gt;', '<a>'],
    ['&nbsp;', ' '],
    ['&quot;q&quot;', '"q"'],
    ['&#39;', "'"],
    ['&#8230;', '\u2026'],
    ['&#x2014;', '\u2014'],
    ['&rsquo;', '\u2019']
  ])('decodes %j', (input, expected) => {
    expect(decodeEntities(input)).toBe(expected);
  });

  it.each([
    ['caf&eacute;', 'café'],
    ['ni&ntilde;o', 'niño'],
    ['&uuml;ber', 'über'],
    ['stra&szlig;e', 'straße'],
    ['&Aring;ngstr&ouml;m', 'Ångström'],
    ['&ccedil;a va', 'ça va'],
    ['&frac12; &plusmn; &deg;', '½ ± °']
  ])('decodes the accented letters a language deck is full of: %j', (input, expected) => {
    // Language decks are the most shared kind there is. Without these, every
    // French and Spanish card imports reading "caf&eacute;".
    expect(decodeEntities(input)).toBe(expected);
  });

  it('decodes nbsp to a plain space, not U+00A0', () => {
    // A real non-breaking space defeats Ink's word wrapping and measures oddly
    // in some terminals.
    expect(decodeEntities('a&nbsp;b')).toBe('a b');
    expect(decodeEntities('a&nbsp;b').charCodeAt(1)).toBe(32);
  });

  it('leaves an unknown entity exactly as written', () => {
    // Mangling it into a replacement character loses information the reader
    // could otherwise still make sense of.
    expect(decodeEntities('&nosuchentity;')).toBe('&nosuchentity;');
  });

  it('leaves an out-of-range numeric entity alone', () => {
    expect(decodeEntities('&#1114112;')).toBe('&#1114112;');
    expect(decodeEntities('&#0;')).toBe('&#0;');
  });

  it('leaves a lone surrogate alone rather than producing broken text', () => {
    expect(decodeEntities('&#xD800;')).toBe('&#xD800;');
  });

  it('does not double-decode', () => {
    // "&amp;amp;" is a literal "&amp;", not "&".
    expect(decodeEntities('&amp;amp;')).toBe('&amp;');
  });
});

describe('htmlToText', () => {
  it('returns plain text unchanged', () => {
    expect(text('The capital of France')).toBe('The capital of France');
  });

  it('drops inline formatting but keeps its text', () => {
    expect(text('<b>bold</b> and <i>italic</i>')).toBe('bold and italic');
    expect(text('<span style="color:red">red</span>')).toBe('red');
    expect(text('<a href="http://x">link</a>')).toBe('link');
  });

  it('turns br and block tags into line breaks', () => {
    expect(text('one<br>two')).toBe('one\ntwo');
    expect(text('<div>one</div><div>two</div>')).toBe('one\ntwo');
    expect(text('<ul><li>a</li><li>b</li></ul>')).toBe('a\nb');
  });

  it('collapses the whitespace that HTML would have collapsed', () => {
    // Anki's editor indents its markup; without this every card carries it.
    expect(text('<div>   a     b   </div>')).toBe('a b');
  });

  it('does not double-space adjacent blocks', () => {
    // </div><div> is one line break, not two. Emitting a newline for each tag
    // made every imported card double-spaced.
    expect(text('<div>a</div><div>b</div><div>c</div>')).toBe('a\nb\nc');
    expect(text('<div>a</div><div></div><div>b</div>')).toBe('a\nb');
  });

  it('keeps a deliberate blank line', () => {
    // Which Anki writes as <div><br></div> — the br survives the collapse and
    // becomes the empty line the author asked for.
    expect(text('<div>a</div><div><br></div><div>b</div>')).toBe('a\n\nb');
  });

  it('survives unclosed and stray tags', () => {
    expect(text('<div>unclosed')).toBe('unclosed');
    expect(text('</div>orphan')).toBe('orphan');
    expect(text('<<>>')).toBe('<<>>');
  });

  it('keeps a bare less-than that is not a tag', () => {
    // A maths card writing "a < b" must not lose half its content.
    expect(text('a < b and c > d')).toBe('a < b and c > d');
  });

  it('drops script and style content entirely', () => {
    expect(text('a<script>alert(1)</script>b')).toBe('ab');
    expect(text('a<style>.x{color:red}</style>b')).toBe('ab');
  });

  it('drops them even when the closing tag carries whitespace', () => {
    // Otherwise the tags go and the code stays behind as prose.
    expect(text('a<script >alert(1)</script >b')).toBe('ab');
    expect(text('a<style >.x{}</style >b')).toBe('ab');
  });

  it('drops comments', () => {
    expect(text('a<!-- note to self -->b')).toBe('ab');
  });

  it('decodes entities after stripping tags', () => {
    expect(text('<div>caf&eacute;&nbsp;au lait</div>')).toBe('café au lait');
    expect(text('<b>&amp;</b>')).toBe('&');
  });
});

describe('htmlToText media', () => {
  it('replaces an img with a marker in place', () => {
    const result = htmlToText('The valve <img src="heart.png"> sits here');
    expect(result.images).toEqual(['heart.png']);
    // Position matters: the image belongs mid-sentence, not appended.
    expect(result.text).toBe('The valve \u27E6img:heart.png\u27E7 sits here');
  });

  it.each([
    ['<img src="a.png">', 'a.png'],
    ["<img src='a.png'>", 'a.png'],
    ['<img src=a.png>', 'a.png'],
    ['<img class="x" src="a.png" alt="y">', 'a.png'],
    ['<img SRC="a.png"/>', 'a.png']
  ])('reads src from %j', (html, expected) => {
    expect(htmlToText(html).images).toEqual([expected]);
  });

  it('decodes an entity-escaped filename before looking it up', () => {
    const seen: string[] = [];
    htmlToText('<img src="a&amp;b.png">', {
      resolveMedia: name => {
        seen.push(name);
        return 'stored.png';
      }
    });
    expect(seen).toEqual(['a&b.png']);
  });

  it('drops a filename the marker parser would refuse', () => {
    // Producer and parser share one rule. When they disagreed, a marker was
    // written for "my photo.png" and then silently dropped when read back —
    // the picture vanished and nothing listed it.
    for (const name of ['my photo.png', 'a&b.png', 'sub/dir.png']) {
      const result = htmlToText(`<img src="${name}">`);
      expect(result.images).toEqual([]);
      expect(result.text).toBe('');
    }
  });

  it('keeps a name once it has been resolved to a stored one', () => {
    // Which is what the package importer does: every file is renamed to a hash.
    const result = htmlToText('<img src="my photo.png">', { resolveMedia: () => 'ab12cd34.png' });
    expect(result.images).toEqual(['ab12cd34.png']);
  });

  it('does not mistake data-src for src', () => {
    // A lazy-loading deck writes both, and the placeholder came first.
    const result = htmlToText('<img data-src="placeholder.png" src="real.png">');
    expect(result.images).toEqual(['real.png']);
  });

  it('still reads data-src when that is all there is', () => {
    expect(htmlToText('<img data-src="only.png">').images).toEqual([]);
  });

  it('drops an img with no src', () => {
    expect(htmlToText('<img alt="nothing">').images).toEqual([]);
  });

  it('maps filenames through resolveMedia', () => {
    const result = htmlToText('<img src="heart.png">', { resolveMedia: () => 'ab12cd.png' });
    expect(result.images).toEqual(['ab12cd.png']);
    expect(result.text).toBe('\u27E6img:ab12cd.png\u27E7');
  });

  it('drops an image the deck did not ship', () => {
    // resolveMedia returning undefined means the file is missing from the
    // package; a marker pointing at nothing would render as a broken box.
    const result = htmlToText('a<img src="ghost.png">b', { resolveMedia: () => undefined });
    expect(result.images).toEqual([]);
    expect(result.text).toBe('ab');
  });

  it('records every image in document order', () => {
    expect(htmlToText('<img src="1.png">x<img src="2.png">').images).toEqual(['1.png', '2.png']);
  });

  it('strips audio references and counts them', () => {
    const result = htmlToText('Listen [sound:word.mp3] closely');
    expect(result.sounds).toEqual(['word.mp3']);
    expect(result.text).toBe('Listen closely');
  });

  it.each([
    ['Say [sound:a.mp3] this', 'Say this', 'spaces on both sides collapse to one'],
    ['Say[sound:a.mp3]this', 'Saythis', 'no spaces means no space'],
    ['[sound:a.mp3] Word', 'Word', 'a leading reference leaves no gap'],
    ['Word [sound:a.mp3]', 'Word', 'a trailing reference leaves no gap']
  ])('closes the gap left by %j', (input, expected, _why) => {
    // Removing only the reference left a double space mid-sentence on every
    // audio card in a language deck.
    expect(htmlToText(input).text).toBe(expected);
  });

  it('counts every audio reference in a field', () => {
    expect(htmlToText('[sound:a.mp3] and [sound:b.mp3]').sounds).toEqual(['a.mp3', 'b.mp3']);
  });
});

describe('looksLikeHtml', () => {
  it.each(['<div>x</div>', 'a &amp; b', '<br>', '<!-- x -->'])('detects %j', input => {
    expect(looksLikeHtml(input)).toBe(true);
  });

  it.each(['plain text', 'a < b', '3 > 2', ''])('leaves %j alone', input => {
    expect(looksLikeHtml(input)).toBe(false);
  });
});

describe('isCloze', () => {
  it.each(['{{c1::Paris}}', 'The capital is {{c12::Paris::city}}', '{{c1::a}} and {{c2::b}}'])(
    'detects %j',
    input => {
      expect(isCloze(input)).toBe(true);
    }
  );

  it.each(['{{Front}}', 'plain', '{{c::x}}', '{{FrontSide}}'])('leaves %j alone', input => {
    expect(isCloze(input)).toBe(false);
  });
});
