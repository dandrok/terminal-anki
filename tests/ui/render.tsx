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

/**
 * Let Ink finish rendering.
 *
 * A single zero-delay timer is not always enough: React can defer work past the
 * first timer, so the frame read straight afterwards would still be the
 * previous one. Draining a macrotask and the microtask queue twice covers it.
 */
const tick = async (): Promise<void> => {
  for (let i = 0; i < 2; i++) {
    await new Promise(resolve => setTimeout(resolve, 0));
    await Promise.resolve();
  }
};

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
