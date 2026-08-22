import { describe, expect, it, vi } from 'vitest';
import { applyKey, applyStroke, isPrintable } from '../../src/ui/components/TextField.js';
import { CardForm, type CardDraft } from '../../src/ui/screens/CardForm.js';
import { withRender } from './render.js';
import type { Flashcard } from '../../src/types/index.js';

const BACKSPACE = String.fromCharCode(8);
const DELETE = String.fromCharCode(127);
const ESC = String.fromCharCode(27);

const CARD: Flashcard = {
  id: 'c1',
  front: 'Existing front',
  back: 'Existing back',
  tags: ['alpha', 'beta'],
  easiness: 2.5,
  interval: 1,
  repetitions: 0,
  nextReview: new Date(2026, 7, 22),
  lastReview: null,
  createdAt: new Date(2026, 7, 1)
};

async function type(press: (input: string) => Promise<void>, text: string): Promise<void> {
  for (const character of text) {
    await press(character);
  }
}

describe('applyStroke', () => {
  it('appends printable characters', () => {
    expect(applyStroke('ab', 'c', 10)).toBe('abc');
  });

  it('removes the last character on backspace', () => {
    expect(applyStroke('abc', BACKSPACE, 10)).toBe('ab');
  });

  it('is a no-op on an empty value', () => {
    expect(applyStroke('', BACKSPACE, 10)).toBe('');
  });

  it('respects the maximum length', () => {
    expect(applyStroke('abc', 'd', 3)).toBe('abc');
  });

  it('ignores control characters it does not handle', () => {
    expect(applyStroke('ab', ESC, 10)).toBe('ab');
    expect(applyStroke('ab', `${ESC}[A`, 10)).toBe('ab');
  });

  it.each([' ', '?', 'q', '~'])('treats %j as printable text', stroke => {
    // `?` and `q` are commands elsewhere; in a field they are just characters.
    expect(isPrintable(stroke)).toBe(true);
    expect(applyStroke('', stroke, 10)).toBe(stroke);
  });
});

describe('CardForm', () => {
  it('starts empty when adding', async () => {
    await withRender(<CardForm onSave={vi.fn()} onCancel={vi.fn()} />, ({ frame }) => {
      expect(frame()).toContain('New card');
      expect(frame()).toContain('the question…');
    });
  });

  it('starts populated when editing', async () => {
    await withRender(<CardForm card={CARD} onSave={vi.fn()} onCancel={vi.fn()} />, ({ frame }) => {
      expect(frame()).toContain('Edit card');
      expect(frame()).toContain('Existing front');
      expect(frame()).toContain('alpha, beta');
    });
  });

  it('collects all three fields and saves', async () => {
    const onSave = vi.fn<(draft: CardDraft) => void>();
    await withRender(<CardForm onSave={onSave} onCancel={vi.fn()} />, async ({ press }) => {
      await type(press, 'Front text');
      await press('\r');
      await type(press, 'Back text');
      await press('\r');
      await type(press, 'one, two');
      await press('\r');
    });

    expect(onSave).toHaveBeenCalledOnce();
    expect(onSave.mock.calls[0][0]).toEqual({
      front: 'Front text',
      back: 'Back text',
      tags: ['one', ' two']
    });
  });

  it('refuses to save without a front and a back', async () => {
    const onSave = vi.fn();
    await withRender(<CardForm onSave={onSave} onCancel={vi.fn()} />, async ({ frame, press }) => {
      await type(press, 'only a front');
      await press('\r');
      await press('\r');
      await press('\r');
      expect(onSave).not.toHaveBeenCalled();
      expect(frame()).toContain('front and back are required');
    });
  });

  it('treats ? and q as text rather than commands', async () => {
    // Outside a field these open help and leave the screen.
    const onCancel = vi.fn();
    await withRender(
      <CardForm onSave={vi.fn()} onCancel={onCancel} />,
      async ({ frame, press }) => {
        await type(press, 'q?');
        expect(frame()).toContain('q?');
        expect(frame()).not.toContain('Keys on this screen');
        expect(onCancel).not.toHaveBeenCalled();
      }
    );
  });

  // Cancelling with Escape is covered by the pty run, not here:
  // ink-testing-library never delivers a lone ESC byte to useInput.

  it.each([
    ['ctrl', { ctrl: true }],
    ['meta', { meta: true }]
  ])('ignores a %s chord instead of typing its letter', (_name, flags) => {
    // Ink reports Ctrl+D as input "d" with ctrl set, and "d" is printable.
    expect(applyKey('ab', 'd', flags, 10)).toBe('ab');
  });

  it('still deletes on backspace even though the flag path runs first', () => {
    expect(applyKey('abc', '', { backspace: true }, 10)).toBe('ab');
  });

  it('shows the start of a long value in an unfocused field', async () => {
    // Scrolling to the tail without a caret reads as text chopped off the
    // front, which is what an unfocused field used to look like.
    const long = {
      ...CARD,
      back: 'A step-by-step procedure for solving a problem, written out at length'
    };
    await withRender(<CardForm card={long} onSave={vi.fn()} onCancel={vi.fn()} />, ({ frame }) => {
      expect(frame()).toContain('A step-by-step');
      expect(frame()).toContain('…');
    });
  });

  it('backspaces within the active field', async () => {
    // Ink reports backspace as a key flag with empty input, which is why the
    // screen calls applyKey rather than forwarding the character.
    await withRender(<CardForm onSave={vi.fn()} onCancel={vi.fn()} />, async ({ frame, press }) => {
      await type(press, 'abc');
      await press(DELETE);
      expect(frame()).toContain('ab');
      expect(frame()).not.toContain('abc');
    });
  });
});
