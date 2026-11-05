import { useState } from 'react';
import { Layout } from '../components/Layout.js';
import { SelectList, type SelectItem } from '../components/SelectList.js';
import { MENU_CONTROLS } from '../controls.js';
import { useScreenInput } from '../hooks/useScreenInput.js';
import { useHelp } from '../hooks/useHelp.js';
import { useAppState } from '../hooks/useStore.js';
import { selectExtendedStats } from '../../state/selectors.js';
import type { Screen } from './Screen.js';

/**
 * Icons come from glyphs the common terminal fonts actually contain —
 * JetBrainsMono Nerd Font, CaskaydiaMono NF and friends — and follow two rules.
 *
 * One: the font has to contain it. A glyph it is missing is not a missing cell
 * but a borrowed one, drawn by a fallback face at another size and baseline, so
 * the row stops lining up with its neighbours (`⚙`, `◑`, `◰`, `◐`, `❖` are all
 * absent from JetBrainsMono NF).
 *
 * Two: `string-width` has to measure it as one cell, because Ink lays the row
 * out with that number. `☰` is East Asian Wide and measures two, which pushed
 * the hint beside it a column left of every other hint.
 *
 * Check both before adding one:
 *   fc-query -f '%{charset}' <font>      # is it in the font?
 *   node -e "console.log(require('string-width')('X'))"
 */
const ITEMS: SelectItem<Screen>[] = [
  { value: 'study', label: '◆ Study due cards' },
  { value: 'custom-study', label: '◎ Custom study session' },
  { value: 'add', label: '+ Add new card' },
  { value: 'browse', label: '□ Browse cards', hint: 'view · edit · delete' },
  { value: 'search', label: '◉ Search cards' },
  { value: 'achievements', label: '✓ Achievements' },
  { value: 'analytics', label: '◶ Analytics & history' },
  { value: 'stats', label: '◈ Quick stats' },
  { value: 'settings', label: '≡ Settings', hint: 'theme · goals · defaults' },
  { value: 'exit', label: '⏻ Exit' }
];

export interface MainMenuProps {
  onSelect: (screen: Screen) => void;
  onQuit: () => void;
}

export function MainMenu({ onSelect, onQuit }: MainMenuProps) {
  const [index, setIndex] = useState(0);
  const { isHelpOpen, toggleHelp } = useHelp();
  const stats = selectExtendedStats(useAppState());

  // The root screen has nowhere to go back to, so esc quits like q.
  useScreenInput({ isHelpOpen, toggleHelp, onQuit });

  const streak = stats.learningStreak.currentStreak;
  const status =
    `${stats.dueCards} due · ${stats.totalCards} cards` +
    (streak > 0 ? ` · ${streak}d streak` : '');

  return (
    <Layout
      title="❯ Terminal Anki"
      status={status}
      controls={MENU_CONTROLS}
      isHelpOpen={isHelpOpen}
    >
      <SelectList
        items={ITEMS}
        selectedIndex={index}
        onMove={setIndex}
        onSelect={onSelect}
        isActive={!isHelpOpen}
      />
    </Layout>
  );
}
