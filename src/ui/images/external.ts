import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

/**
 * Drawing a picture with somebody else's program.
 *
 * For a terminal without the graphics protocol the only way to show an image is
 * to turn it into coloured half-block characters, and that needs the pixels —
 * which means decoding PNG *and* JPEG. PNG is a few hundred lines over Node's
 * built-in zlib; JPEG is Huffman coding, dequantisation, an inverse DCT, chroma
 * upsampling and progressive mode, and Anki decks mix the two freely. Hand-
 * rolling half a decoder would render half a deck.
 *
 * So this hands off to a tool that already does it well, if one is installed,
 * and shows a filename when none is. That keeps the dependency count at two.
 */

/** Tools we know how to drive, best first. */
const TOOLS = ['chafa'] as const;

/** Anything slower than this is not worth blocking a card reveal for. */
const TIMEOUT_MS = 2000;

/** A single frame of art is small; a runaway tool is not our problem to hold. */
const MAX_OUTPUT = 4 * 1024 * 1024;

export interface ExternalRenderer {
  name: string;
  /** Absolute path, so the tool cannot be swapped by a later PATH change. */
  command: string;
}

/**
 * Find a usable tool on PATH.
 *
 * Resolved by walking PATH rather than by running `which`, so that finding out
 * whether images are available does not itself spawn a process — this is called
 * during detection, before anything is drawn.
 */
export function findExternalRenderer(
  env: NodeJS.ProcessEnv = process.env
): ExternalRenderer | undefined {
  const directories = (env.PATH ?? '').split(path.delimiter).filter(Boolean);

  for (const name of TOOLS) {
    for (const directory of directories) {
      const candidate = path.join(directory, name);
      if (existsSync(candidate)) {
        return { name, command: candidate };
      }
    }
  }
  return undefined;
}

export interface RenderOptions {
  renderer: ExternalRenderer;
  file: string;
  columns: number;
  rows: number;
}

/**
 * Render an image to coloured text.
 *
 * Arguments go as an array, never a shell string: the filename comes from a
 * deck somebody else wrote, and interpolating it into a shell would make a
 * card called `x.png; rm -rf ~` do exactly that.
 */
export function renderExternal({
  renderer,
  file,
  columns,
  rows
}: RenderOptions): string[] | undefined {
  const width = Math.max(1, Math.trunc(columns));
  const height = Math.max(1, Math.trunc(rows));

  try {
    const output = execFileSync(
      renderer.command,
      [
        `--size=${width}x${height}`,
        // Keep the whole picture inside the box rather than cropping it, and
        // leave no trailing background: the frame around it is Ink's.
        '--clear',
        '--animate=off',
        '--polite=on',
        file
      ],
      {
        timeout: TIMEOUT_MS,
        maxBuffer: MAX_OUTPUT,
        encoding: 'utf-8',
        // Its diagnostics would land in the middle of a rendered frame.
        stdio: ['ignore', 'pipe', 'ignore']
      }
    );

    const lines = output.replace(/\n+$/, '').split('\n');
    return lines.length > 0 ? lines : undefined;
  } catch {
    // Missing, too slow, or it did not like the file. A card without its
    // picture is still a card.
    return undefined;
  }
}
