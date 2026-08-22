import { Box, Text, useInput } from 'ink';
import { useTheme } from '../hooks/useTheme.js';
import { isArrowDown, isArrowUp, isConfirm, splitKeystrokes } from '../keystrokes.js';

export interface SelectItem<T> {
  value: T;
  label: string;
  hint?: string;
}

export interface SelectListProps<T> {
  items: readonly SelectItem<T>[];
  selectedIndex: number;
  onMove: (index: number) => void;
  onSelect: (value: T) => void;
  /** Disable input while an overlay is open. */
  isActive?: boolean;
}

/**
 * A vertical picker driven by arrows or vim keys.
 *
 * Hand-rolled rather than pulling in `ink-select-input`: this is ~40 lines, it
 * supports j/k without patching a third-party component, and it keeps the
 * dependency surface of a published CLI smaller.
 */
export function SelectList<T>({
  items,
  selectedIndex,
  onMove,
  onSelect,
  isActive = true
}: SelectListProps<T>) {
  const theme = useTheme();

  useInput(
    (input, key) => {
      // `% 0` is NaN, which would hand the caller a nonsense index.
      if (items.length === 0) {
        return;
      }

      // Holding a key, or moving quickly, delivers several strokes in one read.
      // The index is tracked locally because React state has not committed
      // between them, so reading `selectedIndex` again would repeat the move.
      const strokes = splitKeystrokes(input);
      const single = strokes.length === 1;
      let index = selectedIndex;
      let moved = false;

      for (const stroke of strokes) {
        const up = (single && key.upArrow) || stroke === 'k' || isArrowUp(stroke);
        const down = (single && key.downArrow) || stroke === 'j' || isArrowDown(stroke);

        if (up) {
          index = (index - 1 + items.length) % items.length;
          moved = true;
        } else if (down) {
          index = (index + 1) % items.length;
          moved = true;
        } else if ((single && key.return) || isConfirm(stroke)) {
          if (moved) {
            onMove(index);
          }
          const item = items[index];
          if (item) {
            onSelect(item.value);
          }
          return;
        }
      }

      if (moved) {
        onMove(index);
      }
    },
    { isActive }
  );

  // Hints line up in their own column rather than trailing each label by a
  // single space, where "Browse cards view · edit · delete" read as one run of
  // text and it was not obvious which half was the entry.
  const labelWidth = Math.max(0, ...items.map(item => item.label.length));

  return (
    <Box flexDirection="column">
      {items.map((item, index) => {
        const isSelected = index === selectedIndex;
        return (
          <Box key={item.label}>
            <Text color={isSelected ? theme.primary : theme.muted}>{isSelected ? '❯ ' : '  '}</Text>
            <Text color={isSelected ? theme.primary : theme.text} bold={isSelected}>
              {item.hint ? item.label.padEnd(labelWidth) : item.label}
            </Text>
            {item.hint ? <Text color={theme.muted}>{`   ${item.hint}`}</Text> : null}
          </Box>
        );
      })}
    </Box>
  );
}
