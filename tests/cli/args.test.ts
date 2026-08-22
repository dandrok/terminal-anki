import { describe, expect, it } from 'vitest';
import { helpText, parseArgs } from '../../src/cli/args.js';

describe('parseArgs', () => {
  it('defaults to interactive mode', () => {
    expect(parseArgs([])).toEqual({ command: 'interactive', unknown: [] });
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
    expect(parseArgs(['--nope', 'extra'])).toEqual({
      command: 'interactive',
      unknown: ['--nope', 'extra']
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
