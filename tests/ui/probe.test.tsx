import { render } from 'ink-testing-library';
import { describe, expect, it } from 'vitest';
import { Probe } from '../../src/ui/components/Probe.js';

/** Render, assert, and always unmount — even when the assertion throws. */
function withRender(node: React.ReactElement, assert: (lastFrame: () => string) => void): void {
  const { lastFrame, unmount } = render(node);
  try {
    assert(() => lastFrame() ?? '');
  } finally {
    unmount();
  }
}

describe('Ink toolchain', () => {
  it('renders a component to a terminal frame', () => {
    withRender(<Probe label="terminal-anki" />, lastFrame => {
      expect(lastFrame()).toContain('terminal-anki');
    });
  });

  it('draws the rounded border box', () => {
    withRender(<Probe label="x" />, lastFrame => {
      expect(lastFrame()).toMatch(/[╭╰]/);
    });
  });
});
