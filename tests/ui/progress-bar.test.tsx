import { describe, expect, it } from 'vitest';
import { ProgressBar } from '../../src/ui/components/ProgressBar.js';
import { withRender } from './render.js';

const bar = (frame: string): string => frame.trim();

describe('ProgressBar', () => {
  it('fills proportionally', async () => {
    await withRender(<ProgressBar current={5} total={10} width={10} />, ({ frame }) => {
      expect(bar(frame())).toBe('█████░░░░░');
    });
  });

  it('is empty at zero and full at the total', async () => {
    await withRender(<ProgressBar current={0} total={4} width={4} />, ({ frame }) => {
      expect(bar(frame())).toBe('░░░░');
    });
    await withRender(<ProgressBar current={4} total={4} width={4} />, ({ frame }) => {
      expect(bar(frame())).toBe('████');
    });
  });

  it('clamps progress beyond the total', async () => {
    await withRender(<ProgressBar current={99} total={4} width={4} />, ({ frame }) => {
      expect(bar(frame())).toBe('████');
    });
  });

  // String.repeat throws a RangeError on a negative or infinite count, and Ink
  // swallows render errors — so an unnormalized width blanks the bar silently
  // rather than failing loudly. A width derived from terminal columns goes
  // negative as soon as the window is narrow enough.
  it.each([
    ['negative', -5],
    ['infinite', Number.POSITIVE_INFINITY],
    ['NaN', Number.NaN]
  ])('renders nothing rather than throwing for a %s width', async (_name, width) => {
    await withRender(<ProgressBar current={1} total={2} width={width} />, ({ frame }) => {
      expect(bar(frame())).toBe('');
    });
  });

  it('truncates a fractional width to whole cells', async () => {
    await withRender(<ProgressBar current={1} total={1} width={3.7} />, ({ frame }) => {
      expect(bar(frame())).toBe('███');
    });
  });

  it('guards a zero total instead of dividing by it', async () => {
    await withRender(<ProgressBar current={1} total={0} width={4} />, ({ frame }) => {
      expect(bar(frame())).toHaveLength(4);
    });
  });
});
