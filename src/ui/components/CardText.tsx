import { Box, Text } from 'ink';
import { parseSegments } from '../../core/media.js';
import { TerminalImage } from './TerminalImage.js';
import { useImages } from '../hooks/useImages.js';

/**
 * A card's text, with its pictures in the right places.
 *
 * A field is not a string once a deck has been imported: an image can sit in
 * the middle of a sentence and where it sits is part of the card. The segments
 * are laid out in order, so text before an image stays before it.
 */

export interface CardTextProps {
  value: string;
  color?: string;
  bold?: boolean;
  /** Space the pictures may use. */
  maxColumns?: number;
  maxRows?: number;
}

export function CardText({ value, color, bold, maxColumns = 40, maxRows = 12 }: CardTextProps) {
  const images = useImages();
  const segments = parseSegments(value);

  // The common case by a wide margin: no picture, so no Box wrapper and no
  // change to how a plain card has always been laid out.
  if (segments.every(segment => segment.kind === 'text')) {
    return (
      <Text color={color} bold={bold}>
        {value}
      </Text>
    );
  }

  return (
    <Box flexDirection="column">
      {segments.map((segment, index) =>
        segment.kind === 'text' ? (
          // A run that is only whitespace would otherwise add a blank line
          // between the words and the picture they belong to.
          segment.value.trim() === '' ? null : (
            <Text key={index} color={color} bold={bold}>
              {segment.value.trim()}
            </Text>
          )
        ) : (
          <TerminalImage
            key={index}
            file={images.resolve(segment.file) ?? segment.file}
            label={segment.file}
            support={images.support}
            {...(images.renderer ? { renderer: images.renderer } : {})}
            maxColumns={maxColumns}
            maxRows={maxRows}
          />
        )
      )}
    </Box>
  );
}
