import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { resolveDataDir } from './paths.js';

/**
 * Where imported images live.
 *
 * Files are named by a hash of their contents rather than by the name the deck
 * gave them. Two decks can each ship a `heart.png` that are different pictures,
 * and importing the second must not overwrite the first — while importing the
 * *same* picture twice should not store it twice.
 */

export const MEDIA_DIR_NAME = 'media';

/** Extensions we are prepared to hand to a terminal as an image. */
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.avif']);

/** Long enough that a collision needs ~2^40 files; short enough to read. */
const HASH_LENGTH = 16;

export interface MediaStore {
  readonly directory: string;
  /**
   * Store one file, returning the name it was stored under, or `undefined`
   * when it is not something we can display.
   */
  put: (originalName: string, contents: Buffer) => string | undefined;
  /** Absolute path of a stored file, or `undefined` when it is missing. */
  resolve: (storedName: string) => string | undefined;
  has: (storedName: string) => boolean;
}

export function mediaDirectory(env: NodeJS.ProcessEnv = process.env): string {
  return path.join(resolveDataDir(env), MEDIA_DIR_NAME);
}

/** True when a filename is an image format worth storing. */
export function isImageName(name: string): boolean {
  return IMAGE_EXTENSIONS.has(path.extname(name).toLowerCase());
}

export function contentName(originalName: string, contents: Buffer): string {
  const digest = createHash('sha256').update(contents).digest('hex').slice(0, HASH_LENGTH);
  return `${digest}${path.extname(originalName).toLowerCase()}`;
}

export interface MediaStoreOptions {
  directory?: string;
}

export function createMediaStore(options: MediaStoreOptions = {}): MediaStore {
  const directory = options.directory ?? mediaDirectory();

  const put = (originalName: string, contents: Buffer): string | undefined => {
    // Audio and video are not rendered, so storing them would fill the data
    // directory with files nothing can ever show.
    if (!isImageName(originalName) || contents.length === 0) {
      return undefined;
    }

    const stored = contentName(originalName, contents);
    const target = path.join(directory, stored);

    // Named by content, so a file that is already there is already correct.
    if (fs.existsSync(target)) {
      return stored;
    }

    const temporary = `${target}.${process.pid}.tmp`;
    try {
      fs.mkdirSync(directory, { recursive: true });
      fs.writeFileSync(temporary, contents);
      fs.renameSync(temporary, target);
      return stored;
    } catch {
      // The cleanup is guarded too. `rmSync` with `force` still throws ENOTDIR
      // when the parent is not a directory, which turned a dropped picture into
      // a failed import — the opposite of what this catch is for.
      try {
        fs.rmSync(temporary, { force: true });
      } catch {
        // A stray temp file is a far smaller problem than a crash.
      }
      // A card that loses its picture is still a usable card.
      return undefined;
    }
  };

  const resolve = (storedName: string): string | undefined => {
    // The name comes out of card text, which came from a deck. Anything with a
    // separator in it must not be joined onto the media directory.
    if (!/^[A-Za-z0-9]+\.[A-Za-z0-9]+$/.test(storedName)) {
      return undefined;
    }
    const target = path.join(directory, storedName);
    return fs.existsSync(target) ? target : undefined;
  };

  return {
    directory,
    put,
    resolve,
    has: (storedName: string) => resolve(storedName) !== undefined
  };
}
