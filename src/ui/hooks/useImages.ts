import { createContext, useContext } from 'react';
import type { ExternalRenderer } from '../images/external.js';
import type { ImageSupport } from '../images/detect.js';

export interface ImageContextValue {
  support: ImageSupport;
  renderer?: ExternalRenderer;
  /** Absolute path of a stored media file, or `undefined` when it is missing. */
  resolve: (storedName: string) => string | undefined;
}

/**
 * How this run can draw pictures.
 *
 * Decided once at startup and passed down, rather than worked out per card:
 * detection reads the environment and looks for a helper on PATH, and doing
 * that inside a render would repeat it on every keystroke of a study session.
 *
 * The default is "cannot draw anything", so a screen rendered on its own — in a
 * test, or before the provider is mounted — shows filenames instead of throwing.
 */
export const ImageContext = createContext<ImageContextValue>({
  support: 'none',
  resolve: () => undefined
});

export function useImages(): ImageContextValue {
  return useContext(ImageContext);
}
