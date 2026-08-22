import { render } from 'ink-testing-library';
import { describe, expect, it } from 'vitest';
import { Probe } from '../../src/ui/components/Probe.js';

describe('Ink toolchain', () => {
  it('renders a component to a terminal frame', () => {
    const { lastFrame } = render(<Probe label="terminal-anki" />);
    expect(lastFrame()).toContain('terminal-anki');
  });

  it('draws the rounded border box', () => {
    const { lastFrame } = render(<Probe label="x" />);
    expect(lastFrame()).toMatch(/[╭╰]/);
  });
});
