import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SEPARATOR,
  detectSeparator,
  formatAnkiText,
  parseAnkiText,
  quoteField,
  resolveSeparator,
  type ExportRow
} from '../../src/core/csv.js';

const TAB = '\t';

describe('resolveSeparator', () => {
  it.each([
    ['tab', '\t'],
    ['Tab', '\t'],
    ['TAB', '\t'],
    ['comma', ','],
    ['semicolon', ';'],
    ['pipe', '|'],
    ['space', ' '],
    ['\\t', '\t'],
    [';', ';']
  ])('resolves %j', (input, expected) => {
    expect(resolveSeparator(input)).toBe(expected);
  });

  it('falls back for something it cannot make sense of', () => {
    expect(resolveSeparator('nonsense')).toBe(DEFAULT_SEPARATOR);
  });
});

describe('detectSeparator', () => {
  it('picks the character that gives a consistent column count', () => {
    expect(detectSeparator(['a\tb\tc', 'd\te\tf'])).toBe('\t');
    expect(detectSeparator(['a;b', 'c;d'])).toBe(';');
  });

  it('ignores a character that merely appears in the prose', () => {
    // Commas in sentences do not produce a consistent column count.
    const lines = ['What, exactly, is this?\tA test', 'Simple\tYes'];
    expect(detectSeparator(lines)).toBe('\t');
  });

  it('skips headers and blank lines when sampling', () => {
    expect(detectSeparator(['#separator:tab', '', 'a;b', 'c;d'])).toBe(';');
  });

  it('ignores a separator that only appears inside a quoted field', () => {
    // "Paris, France" holds a comma that is not a separator. Splitting on the
    // raw text made a tab-separated file look comma-separated.
    const lines = ['"Paris, France"\tThe capital', '"Berlin, Germany"\tAlso a capital'];
    expect(detectSeparator(lines)).toBe('\t');
  });

  it('reads a file whose fields are full of the other candidates', () => {
    const file = parseAnkiText('"a,b;c|d"\tsecond\n"e,f;g|h"\tfourth');
    expect(file.headers.separator).toBe('\t');
    expect(file.rows[0].fields).toEqual(['a,b;c|d', 'second']);
  });

  it('falls back on an empty body', () => {
    expect(detectSeparator([])).toBe(DEFAULT_SEPARATOR);
    expect(detectSeparator(['', '   '])).toBe(DEFAULT_SEPARATOR);
  });
});

describe('parseAnkiText headers', () => {
  it('reads the header block', () => {
    const file = parseAnkiText(
      ['#separator:tab', '#html:true', '#tags column:3', '#deck:Spanish', 'a\tb\tx'].join('\n')
    );
    expect(file.headers.separator).toBe('\t');
    expect(file.headers.html).toBe(true);
    expect(file.headers.tagsColumn).toBe(3);
    expect(file.headers.deck).toBe('Spanish');
  });

  it('defaults html to false when not declared', () => {
    // Getting this wrong lets a card containing "<" be read as markup.
    expect(parseAnkiText('a\tb').headers.html).toBe(false);
  });

  it('reads file-wide tags', () => {
    expect(parseAnkiText('#tags:spanish verbs\na\tb').headers.tags).toEqual(['spanish', 'verbs']);
  });

  it('ignores a header it does not know', () => {
    // Anki adds headers over time; an unknown one must not stop the import.
    const file = parseAnkiText('#notetype column:2\n#somethingnew:x\na\tb');
    expect(file.rows).toHaveLength(1);
  });

  it('strips a UTF-8 BOM so the first header still parses', () => {
    const file = parseAnkiText('\uFEFF#separator:tab\na\tb');
    expect(file.headers.separator).toBe('\t');
    expect(file.rows[0].fields).toEqual(['a', 'b']);
  });

  it('detects the separator when the file does not declare one', () => {
    expect(parseAnkiText('a;b;c\nd;e;f').headers.separator).toBe(';');
  });
});

describe('parseAnkiText rows', () => {
  it('splits plain rows', () => {
    const file = parseAnkiText('#separator:tab\nfront\tback\tt1 t2');
    expect(file.rows).toEqual([{ fields: ['front', 'back', 't1 t2'], line: 2 }]);
  });

  it('skips blank lines', () => {
    expect(parseAnkiText('a\tb\n\n\nc\td').rows).toHaveLength(2);
  });

  it('keeps empty fields', () => {
    expect(parseAnkiText('a\t\tc').rows[0].fields).toEqual(['a', '', 'c']);
  });

  it('reports the source line, for error messages', () => {
    const file = parseAnkiText('#separator:tab\n#html:false\na\tb\nc\td');
    expect(file.rows.map(row => row.line)).toEqual([3, 4]);
  });

  it.each([
    ['"quoted"', ['quoted']],
    ['"has,comma"', ['has,comma']],
    ['"say ""hi"""', ['say "hi"']],
    ['"a","b"', ['a', 'b']]
  ])('handles quoting in %j', (line, expected) => {
    expect(parseAnkiText(`#separator:comma\n${line}`).rows[0].fields).toEqual(expected);
  });

  it('joins a field that contains a newline', () => {
    // A card back with two paragraphs is one field spanning two lines.
    const file = parseAnkiText('#separator:tab\nfront\t"line one\nline two"\ttag');
    expect(file.rows).toHaveLength(1);
    expect(file.rows[0].fields).toEqual(['front', 'line one\nline two', 'tag']);
  });

  it('joins a field spanning three lines', () => {
    const file = parseAnkiText('#separator:tab\nf\t"a\nb\nc"');
    expect(file.rows[0].fields).toEqual(['f', 'a\nb\nc']);
  });

  it('keeps a row whose quote is never closed', () => {
    // Losing a card to one unbalanced quote is worse than importing it odd.
    const file = parseAnkiText('#separator:tab\nfront\t"never closed');
    expect(file.rows).toHaveLength(1);
    expect(file.rows[0].fields[0]).toBe('front');
  });

  it('handles CRLF line endings', () => {
    const file = parseAnkiText('#separator:tab\r\na\tb\r\nc\td');
    expect(file.rows.map(row => row.fields)).toEqual([
      ['a', 'b'],
      ['c', 'd']
    ]);
  });
});

describe('formatAnkiText', () => {
  const rows: ExportRow[] = [
    { guid: 'g1', front: 'What is 2+2?', back: '4', tags: ['maths', 'easy'] },
    { front: 'Capital of France', back: 'Paris', tags: [] }
  ];

  it('writes a header block Anki can read back', () => {
    const output = formatAnkiText(rows);
    expect(output).toContain('#separator:tab');
    expect(output).toContain('#html:false');
    expect(output).toContain('#guid column:1');
    expect(output).toContain('#tags column:4');
  });

  it('omits the guid column when nothing has a guid', () => {
    // Otherwise a hand-typed deck exports with an empty first column on
    // every single line.
    const output = formatAnkiText([{ front: 'a', back: 'b', tags: ['t'] }]);
    expect(output).not.toContain('#guid column');
    expect(output).toContain('#tags column:3');
    expect(output.trim().split('\n').at(-1)).toBe('a\tb\tt');
  });

  it('round-trips a guid-less deck', () => {
    const plain = [{ front: 'a', back: 'b', tags: ['x', 'y'] }];
    const parsed = parseAnkiText(formatAnkiText(plain));
    expect(parsed.headers.guidColumn).toBeUndefined();
    expect(parsed.headers.tagsColumn).toBe(3);
    expect(parsed.rows[0].fields).toEqual(['a', 'b', 'x y']);
  });

  it('joins tags with spaces, as Anki does', () => {
    expect(formatAnkiText(rows)).toContain(`maths easy`);
  });

  it('names the deck when asked', () => {
    expect(formatAnkiText(rows, { deck: 'Spanish' })).toContain('#deck:Spanish');
  });

  it('ends with a newline', () => {
    expect(formatAnkiText(rows).endsWith('\n')).toBe(true);
  });

  it('round-trips through the parser', () => {
    const file = parseAnkiText(formatAnkiText(rows));
    expect(file.headers.separator).toBe(TAB);
    expect(file.headers.guidColumn).toBe(1);
    expect(file.headers.tagsColumn).toBe(4);
    expect(file.rows.map(row => row.fields)).toEqual([
      ['g1', 'What is 2+2?', '4', 'maths easy'],
      ['', 'Capital of France', 'Paris', '']
    ]);
  });

  /** Where front/back/tags landed, according to the file's own headers. */
  function columns(file: ReturnType<typeof parseAnkiText>) {
    const tags = file.headers.tagsColumn ?? 3;
    return { front: tags - 3, back: tags - 2, tags: tags - 1 };
  }

  it.each([
    ['a\tb', 'field holding the separator'],
    ['say "hi"', 'field holding a quote'],
    ['line one\nline two', 'field holding a newline']
  ])('round-trips a %s', (value, _name) => {
    const file = parseAnkiText(formatAnkiText([{ front: value, back: 'b', tags: [] }]));
    expect(file.rows[0].fields[columns(file).front]).toBe(value);
  });

  it('round-trips every awkward field at once', () => {
    const nasty: ExportRow[] = [
      { front: 'tab\there', back: 'quote"here', tags: ['a'] },
      { front: 'new\nline', back: 'comma,here', tags: ['b', 'c'] },
      { front: '', back: '', tags: [] }
    ];
    const parsed = parseAnkiText(formatAnkiText(nasty));
    const at = columns(parsed);
    expect(
      parsed.rows.map(row => [row.fields[at.front], row.fields[at.back], row.fields[at.tags]])
    ).toEqual([
      ['tab\there', 'quote"here', 'a'],
      ['new\nline', 'comma,here', 'b c'],
      ['', '', '']
    ]);
  });
});

describe('quoteField', () => {
  it('leaves an ordinary field alone', () => {
    expect(quoteField('plain', TAB)).toBe('plain');
  });

  it.each([
    ['a\tb', TAB],
    ['a"b', TAB],
    ['a\nb', TAB],
    ['a,b', ',']
  ])('quotes %j', (value, separator) => {
    expect(quoteField(value, separator).startsWith('"')).toBe(true);
  });

  it('doubles an embedded quote', () => {
    expect(quoteField('say "hi"', TAB)).toBe('"say ""hi"""');
  });
});
