import { render } from 'ink-testing-library';
import type { ReactElement } from 'react';

export interface Rendered {
  frame: () => string;
  frames: string[];
  press: (input: string) => void;
}

/** Render, run the assertions, and always unmount — even on failure. */
export function withRender(node: ReactElement, assert: (rendered: Rendered) => void): void {
  const instance = render(node);
  try {
    assert({
      frame: () => instance.lastFrame() ?? '',
      frames: instance.frames,
      press: (input: string) => instance.stdin.write(input)
    });
  } finally {
    instance.unmount();
  }
}

const ESC = String.fromCharCode(27);

export const ARROW_DOWN = `${ESC}[B`;
export const ARROW_UP = `${ESC}[A`;
export const ENTER = '\r';
export const ESCAPE = ESC;
