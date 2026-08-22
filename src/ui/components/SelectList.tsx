import { Box, Text, useInput } from 'ink';
import { useTheme } from '../hooks/useTheme.js';

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
      if (key.upArrow || input === 'k') {
        onMove((selectedIndex - 1 + items.length) % items.length);
      } else if (key.downArrow || input === 'j') {
        onMove((selectedIndex + 1) % items.length);
      } else if (key.return) {
        const item = items[selectedIndex];
        if (item) {
          onSelect(item.value);
        }
      }
    },
    { isActive }
  );

  return (
    <Box flexDirection="column">
      {items.map((item, index) => {
        const isSelected = index === selectedIndex;
        return (
          <Box key={item.label}>
            <Text color={isSelected ? theme.primary : theme.muted}>{isSelected ? '❯ ' : '  '}</Text>
            <Text color={isSelected ? theme.primary : theme.text} bold={isSelected}>
              {item.label}
            </Text>
            {item.hint ? <Text color={theme.muted}> {item.hint}</Text> : null}
          </Box>
        );
      })}
    </Box>
  );
}
