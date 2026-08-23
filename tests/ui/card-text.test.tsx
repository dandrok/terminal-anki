import { describe, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';
import { CardText } from '../../src/ui/components/CardText.js';
import { ImageContext, type ImageContextValue } from '../../src/ui/hooks/useImages.js';
import { imageMarker } from '../../src/core/media.js';
import { withRender } from './render.js';

function withImages(node: ReactElement, value: Partial<ImageContextValue> = {}): ReactElement {
  return (
    <ImageContext.Provider value={{ support: 'none', resolve: () => undefined, ...value }}>
      {node}
    </ImageContext.Provider>
  );
}

describe('CardText', () => {
  it('renders plain text unchanged', async () => {
    await withRender(
      withImages(<CardText value="What is the capital of France?" />),
      ({ frame }) => {
        expect(frame().trim()).toBe('What is the capital of France?');
      }
    );
  });

  it('keeps a multi-line answer intact', async () => {
    await withRender(withImages(<CardText value={'first\nsecond'} />), ({ frame }) => {
      expect(frame()).toContain('first');
      expect(frame()).toContain('second');
    });
  });

  it('names a picture it cannot draw', async () => {
    const value = `Look at ${imageMarker('heart.png')} closely`;
    await withRender(withImages(<CardText value={value} />), ({ frame }) => {
      expect(frame()).toContain('[image: heart.png]');
      expect(frame()).toContain('Look at');
      expect(frame()).toContain('closely');
    });
  });

  it('keeps the text around a picture in order', async () => {
    // Where an image sits in a sentence is part of the card.
    const value = `before ${imageMarker('x.png')} after`;
    await withRender(withImages(<CardText value={value} />), ({ frame }) => {
      const lines = frame()
        .split('\n')
        .filter(line => line.trim());
      expect(lines[0]).toContain('before');
      expect(lines[1]).toContain('x.png');
      expect(lines[2]).toContain('after');
    });
  });

  it('adds no blank line for the whitespace around a picture', async () => {
    await withRender(withImages(<CardText value={`${imageMarker('x.png')}   `} />), ({ frame }) => {
      expect(
        frame()
          .split('\n')
          .filter(line => line.trim())
      ).toHaveLength(1);
    });
  });

  it('names a picture whose file has gone missing', async () => {
    // The marker survives in the card text even if the media directory does
    // not, so this has to degrade rather than throw.
    await withRender(
      withImages(<CardText value={imageMarker('gone.png')} />, {
        support: 'kitty',
        resolve: () => undefined
      }),
      ({ frame }) => {
        expect(frame()).toContain('[image: gone.png]');
      }
    );
  });

  it('asks the image store to resolve the stored name', async () => {
    const resolve = vi.fn(() => undefined);
    await withRender(withImages(<CardText value={imageMarker('ab12.png')} />, { resolve }), () => {
      expect(resolve).toHaveBeenCalledWith('ab12.png');
    });
  });
});
