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
  it('marks the selected row with a cursor', async () => {
    await withRender(list(1).element, ({ frame }) => {
      const lines = frame().split('\n');
      expect(lines[1]).toContain('❯');
      expect(lines[0]).not.toContain('❯');
    });
  });

  it.each([
    ['arrow down', ARROW_DOWN],
    ['j', 'j']
  ])('moves down with %s', async (_name, key) => {
    const { element, onMove } = list(0);
    await withRender(element, async ({ press }) => {
      await press(key);
      expect(onMove).toHaveBeenCalledWith(1);
    });
  });

  it.each([
    ['arrow up', ARROW_UP],
    ['k', 'k']
  ])('moves up with %s', async (_name, key) => {
    const { element, onMove } = list(1);
    await withRender(element, async ({ press }) => {
      await press(key);
      expect(onMove).toHaveBeenCalledWith(0);
    });
  });

  it('wraps from the last row to the first', async () => {
    const { element, onMove } = list(ITEMS.length - 1);
    await withRender(element, async ({ press }) => {
      await press('j');
      expect(onMove).toHaveBeenCalledWith(0);
    });
  });

  it('wraps from the first row to the last', async () => {
    const { element, onMove } = list(0);
    await withRender(element, async ({ press }) => {
      await press('k');
      expect(onMove).toHaveBeenCalledWith(ITEMS.length - 1);
    });
  });

  it('selects the highlighted value on enter', async () => {
    const { element, onSelect } = list(2);
    await withRender(element, async ({ press }) => {
      await press(ENTER);
      expect(onSelect).toHaveBeenCalledWith('c');
    });
  });

  it('applies every stroke when several arrive in one read', async () => {
    // Holding j, or moving quickly, delivers "jjj" as a single chunk. Reading
    // selectedIndex per stroke would repeat the same move three times.
    const { element, onMove } = list(0);
    await withRender(element, async ({ press }) => {
      await press('jj');
      expect(onMove).toHaveBeenCalledTimes(1);
      expect(onMove).toHaveBeenCalledWith(2);
    });
  });

  it('wraps correctly across a multi-stroke chunk', async () => {
    const { element, onMove } = list(0);
    await withRender(element, async ({ press }) => {
      await press('jjj');
      expect(onMove).toHaveBeenCalledWith(0);
    });
  });

  it('selects after moving within the same chunk', async () => {
    const { element, onMove, onSelect } = list(0);
    await withRender(element, async ({ press }) => {
      await press('j\r');
      expect(onMove).toHaveBeenCalledWith(1);
      expect(onSelect).toHaveBeenCalledWith('b');
    });
  });

  it('ignores input while inactive', async () => {
    // Screens pass isActive={!isHelpOpen}, so the overlay swallows all keys.
    const { element, onMove, onSelect } = list(0, vi.fn(), vi.fn(), false);
    await withRender(element, async ({ press }) => {
      await press('j');
      await press(ENTER);
      expect(onMove).not.toHaveBeenCalled();
      expect(onSelect).not.toHaveBeenCalled();
    });
  });
});
