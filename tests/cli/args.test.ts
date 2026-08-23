import { describe, expect, it } from 'vitest';
import { helpText, parseArgs } from '../../src/cli/args.js';

describe('parseArgs', () => {
  it('defaults to interactive mode', () => {
    // toMatchObject, not toEqual: asserting the whole shape means every new
    // option breaks a test that is not about that option.
    expect(parseArgs([])).toMatchObject({ command: 'interactive', unknown: [] });
  });

  it.each(['--study', '-s'])('recognises %s', flag => {
    expect(parseArgs([flag]).command).toBe('study');
  });

  it.each(['--help', '-h'])('recognises %s', flag => {
    expect(parseArgs([flag]).command).toBe('help');
  });

  it.each(['--version', '-v'])('recognises %s', flag => {
    expect(parseArgs([flag]).command).toBe('version');
  });

  it('lets help win over other flags', () => {
    expect(parseArgs(['--study', '--help']).command).toBe('help');
  });

  it('collects unrecognised arguments', () => {
    expect(parseArgs(['--nope', 'extra'])).toMatchObject({
      command: 'interactive',
      unknown: ['--nope', 'extra']
    });
  });

  describe('subcommands', () => {
    it.each(['import', 'export'])('recognises %s with a file', name => {
      expect(parseArgs([name, 'deck.csv'])).toMatchObject({ command: name, file: 'deck.csv' });
    });

    it('only treats the first word as a subcommand', () => {
      // So a deck actually named "export.csv" cannot change what runs.
      expect(parseArgs(['import', 'export.csv'])).toMatchObject({
        command: 'import',
        file: 'export.csv'
      });
    });

    it('reads the field overrides', () => {
      expect(parseArgs(['import', 'd.csv', '--front', '2', '--back', '4'])).toMatchObject({
        front: 2,
        back: 4
      });
    });

    it.each(['0', 'abc', ''])('reports a nonsense --front of %j', value => {
      // Silently falling back would import the wrong field because of a typo,
      // and nothing would say so.
      const args = parseArgs(['import', 'd.csv', '--front', value]);
      expect(args.front).toBeUndefined();
      expect(args.unknown.join()).toContain('--front');
    });

    it('does not let an option swallow the flag after it', () => {
      // "--front --dry-run" used to consume the flag, so the dry run silently
      // did not happen and the import wrote for real.
      const args = parseArgs(['import', 'd.csv', '--front', '--dry-run']);
      expect(args.dryRun).toBe(true);
      expect(args.front).toBeUndefined();
      expect(args.unknown.join()).toContain('--front');
    });

    it('does not let --tag swallow the file', () => {
      const args = parseArgs(['import', '--tag', '--dry-run', 'deck.csv']);
      expect(args.dryRun).toBe(true);
      expect(args.file).toBe('deck.csv');
      expect(args.tag).toBeUndefined();
    });

    it('reads a tag and a dry run', () => {
      expect(parseArgs(['import', 'd.csv', '--tag', 'spanish', '--dry-run'])).toMatchObject({
        tag: 'spanish',
        dryRun: true
      });
    });

    it('does not mistake an option value for the file', () => {
      expect(parseArgs(['import', '--tag', 'spanish', 'deck.csv']).file).toBe('deck.csv');
    });

    it('reports an option left without its value', () => {
      expect(parseArgs(['import', 'd.csv', '--tag']).unknown.join()).toContain('--tag');
      expect(parseArgs(['import', 'd.csv', '--front']).unknown.join()).toContain('--front');
    });

    it('keeps only the first bare word as the file', () => {
      expect(parseArgs(['export', 'a.csv', 'b.csv'])).toMatchObject({
        file: 'a.csv',
        unknown: ['b.csv']
      });
    });

    it('leaves the file undefined when none was given', () => {
      expect(parseArgs(['import']).file).toBeUndefined();
    });
  });
});

describe('helpText', () => {
  it('includes the version and the data-directory override', () => {
    const text = helpText('9.9.9');
    expect(text).toContain('v9.9.9');
    expect(text).toContain('TERMINAL_ANKI_DATA_DIR');
  });
});
