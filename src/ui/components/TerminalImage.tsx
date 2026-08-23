import fs from 'node:fs';
import { useEffect, useMemo, useState } from 'react';
import { Box, Text, useStdout } from 'ink';
import {
  deleteImage,
  fitCells,
  placeholderRows,
  transmitSequences,
  virtualPlacement
} from '../images/kitty.js';
import { renderExternal, type ExternalRenderer } from '../images/external.js';
import { imagePixelSize } from '../images/size.js';
import { useTheme } from '../hooks/useTheme.js';
import type { ImageSupport } from '../images/detect.js';

/**
 * One picture, drawn as well as this terminal allows.
 *
 * Transmission is a side effect on stdout, so it happens in an effect and is
 * remembered: a study session re-renders on every keystroke, and re-sending a
 * megabyte of base64 each time would make the loop crawl.
 */

/**
 * Files the terminal is currently holding, oldest first.
 *
 * Bounded, because the terminal keeps every image sent to it: a long session
 * through a deck of a few thousand illustrated cards would otherwise leave the
 * terminal holding all of them. Insertion order is eviction order — a Map
 * preserves it, so the oldest entry is simply the first key.
 */
const transmitted = new Map<string, number>();

/** Roughly a session's worth of cards, and a few megabytes in the terminal. */
export const MAX_HELD_IMAGES = 64;

/**
 * Ids start high enough not to collide with another program's.
 *
 * The id also becomes the cell's foreground colour, so it has to fit in 24 bits.
 */
let nextId = 0x00a000;

function idFor(file: string): number {
  const existing = transmitted.get(file);
  if (existing !== undefined) {
    return existing;
  }
  const id = nextId++;
  transmitted.set(file, id);
  return id;
}

/**
 * Ask the terminal to forget the images it has been holding longest.
 *
 * The card showing them has moved on, and a placeholder for a released image
 * simply draws nothing — which is why this is safe to do while the session
 * continues.
 */
function evictOldest(write: (text: string) => void): void {
  while (transmitted.size > MAX_HELD_IMAGES) {
    const oldest = transmitted.entries().next().value;
    if (!oldest) {
      return;
    }
    const [file, id] = oldest;
    write(deleteImage(id));
    transmitted.delete(file);
    sentFiles.delete(file);
  }
}

/** Files whose bytes the terminal already holds. */
const sentFiles = new Set<string>();

export interface TerminalImageProps {
  /** Absolute path of the stored file. */
  file: string;
  /** Name to fall back to when the picture cannot be drawn. */
  label: string;
  support: ImageSupport;
  renderer?: ExternalRenderer;
  maxColumns: number;
  maxRows: number;
}

export function TerminalImage({
  file,
  label,
  support,
  renderer,
  maxColumns,
  maxRows
}: TerminalImageProps) {
  const theme = useTheme();
  const { write } = useStdout();

  const size = useMemo(() => imagePixelSize(file), [file]);
  const cells = useMemo(
    () => fitCells(size?.width ?? 0, size?.height ?? 0, maxColumns, maxRows),
    [size, maxColumns, maxRows]
  );

  const usable = support !== 'none' && fs.existsSync(file);
  const id = useMemo(
    () => (usable && support === 'kitty' ? idFor(file) : 0),
    [usable, support, file]
  );

  /**
   * Which placement the terminal is currently holding for this image.
   *
   * Both the transmission and the placement happen before this is set, and the
   * placeholder grid is not rendered until it matches — so the escape that
   * reserves the area always reaches the terminal before the cells that fill
   * it. Writing the placement from its own effect happened to work, but only
   * because of how Ink batches its writes, which is not something to rely on.
   */
  const wanted = `${id}:${cells.columns}x${cells.rows}`;
  const [placed, setPlaced] = useState<string>();

  useEffect(() => {
    if (!usable || support !== 'kitty' || placed === wanted) {
      return;
    }

    // Sent once per file; a re-placement after a resize is cheap, a second
    // transmission of a megabyte of base64 is not.
    if (!sentFiles.has(file)) {
      let data: Buffer;
      try {
        data = fs.readFileSync(file);
      } catch {
        return;
      }
      for (const sequence of transmitSequences({ id, data })) {
        write(sequence);
      }
      sentFiles.add(file);
      evictOldest(write);
    }

    write(virtualPlacement(id, cells.columns, cells.rows));
    setPlaced(wanted);
  }, [usable, support, file, id, cells.columns, cells.rows, placed, wanted, write]);

  /**
   * Block art, once the tool has produced it.
   *
   * In state rather than computed during render: the tool is a subprocess, and
   * waiting for one inside a render stopped the whole interface for however
   * long it took every time a card with a picture came up.
   */
  const [external, setExternal] = useState<string[]>();
  useEffect(() => {
    if (!usable || support !== 'external' || !renderer) {
      return;
    }

    let live = true;
    void renderExternal({ renderer, file, columns: cells.columns, rows: cells.rows }).then(
      lines => {
        // The card may have been graded and gone while the tool was working.
        if (live) {
          setExternal(lines);
        }
      }
    );
    return () => {
      live = false;
    };
  }, [usable, support, renderer, file, cells.columns, cells.rows]);

  if (!usable) {
    return <Text color={theme.muted}>{`[image: ${label}]`}</Text>;
  }

  if (support === 'kitty') {
    if (placed !== wanted) {
      // One frame before the placement lands. Reserving the space now stops the
      // card jumping when the picture appears.
      return <Box height={cells.rows} />;
    }
    return (
      <Box flexDirection="column">
        {placeholderRows({ id, columns: cells.columns, rows: cells.rows }).map((row, index) => (
          <Text key={index}>{row}</Text>
        ))}
      </Box>
    );
  }

  if (external) {
    return (
      <Box flexDirection="column">
        {external.map((row, index) => (
          <Text key={index}>{row}</Text>
        ))}
      </Box>
    );
  }

  return <Text color={theme.muted}>{`[image: ${label}]`}</Text>;
}
