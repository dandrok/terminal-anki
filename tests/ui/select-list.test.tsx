import { describe, expect, it, vi } from 'vitest';
import { SelectList, type SelectItem } from '../../src/ui/components/SelectList.js';
import { ARROW_DOWN, ARROW_UP, ENTER, withRender } from './render.js';

const ITEMS: SelectItem<string>[] = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Bravo' },
  { value: 'c', label: 'Charlie' }
];

function list(index: number, onMove = vi.fn(), onSelect = vi.fn(), isActive = true) {
  return {
    element: (
      <SelectList
        items={ITEMS}
        selectedIndex={index}
        onMove={onMove}
        onSelect={onSelect}
        isActive={isActive}
      />
    ),
    onMove,
    onSelect
  };
}

describe('SelectList', () => {
  it('marks the selected row with a cursor', () => {
    withRender(list(1).element, ({ frame }) => {
      const lines = frame().split('\n');
      expect(lines[1]).toContain('❯');
      expect(lines[0]).not.toContain('❯');
    });
  });

  it.each([
    ['arrow down', ARROW_DOWN],
    ['j', 'j']
  ])('moves down with %s', (_name, key) => {
    const { element, onMove } = list(0);
    withRender(element, ({ press }) => {
      press(key);
      expect(onMove).toHaveBeenCalledWith(1);
    });
  });

  it.each([
    ['arrow up', ARROW_UP],
    ['k', 'k']
  ])('moves up with %s', (_name, key) => {
    const { element, onMove } = list(1);
    withRender(element, ({ press }) => {
      press(key);
      expect(onMove).toHaveBeenCalledWith(0);
    });
  });

  it('wraps from the last row to the first', () => {
    const { element, onMove } = list(ITEMS.length - 1);
    withRender(element, ({ press }) => {
      press('j');
      expect(onMove).toHaveBeenCalledWith(0);
    });
  });

  it('wraps from the first row to the last', () => {
    const { element, onMove } = list(0);
    withRender(element, ({ press }) => {
      press('k');
      expect(onMove).toHaveBeenCalledWith(ITEMS.length - 1);
    });
  });

  it('selects the highlighted value on enter', () => {
    const { element, onSelect } = list(2);
    withRender(element, ({ press }) => {
      press(ENTER);
      expect(onSelect).toHaveBeenCalledWith('c');
    });
  });

  it('ignores input while inactive', () => {
    // Screens pass isActive={!isHelpOpen}, so the overlay swallows all keys.
    const { element, onMove, onSelect } = list(0, vi.fn(), vi.fn(), false);
    withRender(element, ({ press }) => {
      press('j');
      press(ENTER);
      expect(onMove).not.toHaveBeenCalled();
      expect(onSelect).not.toHaveBeenCalled();
    });
  });
});
