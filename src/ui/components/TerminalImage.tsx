import fs from 'node:fs';
import { useEffect, useMemo, useState } from 'react';
import { Box, Text, useStdout } from 'ink';
import { fitCells, placeholderRows, transmitSequences, virtualPlacement } from '../images/kitty.js';
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

/** Image ids handed out so far, keyed by the file they belong to. */
const transmitted = new Map<string, number>();

/** Files whose bytes the terminal already holds. */
const sentFiles = new Set<string>();

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

/** Forget everything sent, so a new run does not reuse a stale placement. */
export function resetTransmittedImages(): void {
  transmitted.clear();
  sentFiles.clear();
}

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
    }

    write(virtualPlacement(id, cells.columns, cells.rows));
    setPlaced(wanted);
  }, [usable, support, file, id, cells.columns, cells.rows, placed, wanted, write]);

  const external = useMemo(() => {
    if (!usable || support !== 'external' || !renderer) {
      return undefined;
    }
    return renderExternal({ renderer, file, columns: cells.columns, rows: cells.rows });
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
