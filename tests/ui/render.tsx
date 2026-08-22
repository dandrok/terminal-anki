import { render } from 'ink-testing-library';
import type { ReactElement } from 'react';

export interface Rendered {
  frame: () => string;
  frames: string[];
  /**
   * Send input and wait for Ink to re-render.
   *
   * Must be awaited: `stdin.write` only queues the keypress, so reading the
   * frame synchronously afterwards returns the previous render.
   */
  press: (input: string) => Promise<void>;
}

const tick = (): Promise<void> => new Promise(resolve => setTimeout(resolve, 0));

/** Render, run the assertions, and always unmount — even on failure. */
export async function withRender(
  node: ReactElement,
  assert: (rendered: Rendered) => void | Promise<void>
): Promise<void> {
  const instance = render(node);
  try {
    await tick();
    await assert({
      frame: () => instance.lastFrame() ?? '',
      frames: instance.frames,
      press: async (input: string) => {
        instance.stdin.write(input);
        await tick();
      }
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
