import { describe, expect, it } from 'vitest';
import {
  describeSupport,
  detectImageSupport,
  isMultiplexed,
  resolveImageSupport
} from '../../../src/ui/images/detect.js';

const env = (values: Partial<Record<string, string>>) => values as NodeJS.ProcessEnv;

describe('detectImageSupport', () => {
  it.each([
    ['kitty by TERM', { TERM: 'xterm-kitty' }],
    ['kitty by window id', { KITTY_WINDOW_ID: '1' }],
    ['ghostty by TERM', { TERM: 'xterm-ghostty' }],
    ['ghostty by program', { TERM_PROGRAM: 'ghostty' }],
    ['wezterm', { TERM_PROGRAM: 'WezTerm' }]
  ])('recognises %s', (_name, values) => {
    expect(detectImageSupport({ env: env(values) })).toBe('kitty');
  });

  it('falls back to an external tool when there is one', () => {
    expect(
      detectImageSupport({ env: env({ TERM: 'xterm-256color' }), hasExternalTool: true })
    ).toBe('external');
  });

  it('gives up when there is neither', () => {
    expect(detectImageSupport({ env: env({ TERM: 'xterm-256color' }) })).toBe('none');
  });

  it('turns the protocol off inside a multiplexer', () => {
    // tmux forwards graphics escapes only with allow-passthrough on, and screen
    // not at all. Guessing wrong paints escape sequences across the frame as
    // literal text, which is far worse than showing a filename.
    expect(detectImageSupport({ env: env({ TERM: 'xterm-kitty', TMUX: '/tmp/tmux-1000' }) })).toBe(
      'none'
    );
    expect(
      detectImageSupport({ env: env({ KITTY_WINDOW_ID: '1', TERM: 'screen.xterm-kitty' }) })
    ).toBe('none');
  });

  it('prefers an external tool over nothing inside a multiplexer', () => {
    expect(
      detectImageSupport({ env: env({ TERM: 'xterm-kitty', TMUX: 'x' }), hasExternalTool: true })
    ).toBe('external');
  });
});

describe('isMultiplexed', () => {
  it.each([{ TMUX: '/tmp/x' }, { TERM: 'screen' }, { TERM: 'screen-256color' }])(
    'detects %j',
    values => {
      expect(isMultiplexed(env(values))).toBe(true);
    }
  );

  it.each([{ TERM: 'xterm-kitty' }, {}])('leaves %j alone', values => {
    expect(isMultiplexed(env(values))).toBe(false);
  });
});

describe('resolveImageSupport', () => {
  const plain = { env: env({ TERM: 'xterm-256color' }) };

  it('honours an explicit kitty even when detection disagrees', () => {
    // Somebody who has turned tmux passthrough on knows better than this does.
    expect(resolveImageSupport('kitty', { env: env({ TERM: 'dumb', TMUX: 'x' }) })).toBe('kitty');
  });

  it('turns everything off when asked to', () => {
    expect(resolveImageSupport('off', { env: env({ TERM: 'xterm-kitty' }) })).toBe('none');
  });

  it('needs a tool to use one', () => {
    expect(resolveImageSupport('external', plain)).toBe('none');
    expect(resolveImageSupport('external', { ...plain, hasExternalTool: true })).toBe('external');
  });

  it('defers to detection on auto', () => {
    expect(resolveImageSupport('auto', { env: env({ TERM: 'xterm-kitty' }) })).toBe('kitty');
    expect(resolveImageSupport('auto', plain)).toBe('none');
  });
});

describe('describeSupport', () => {
  it('explains what the reader will actually get', () => {
    expect(describeSupport('kitty')).toContain('full resolution');
    expect(describeSupport('external')).toContain('blocks');
  });

  it('names tmux as the reason when it is the reason', () => {
    expect(describeSupport('none', env({ TMUX: 'x' }))).toContain('tmux');
    expect(describeSupport('none', env({}))).not.toContain('tmux');
  });
});
