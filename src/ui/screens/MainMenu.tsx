import { useState } from 'react';
import { useInput } from 'ink';
import { Layout } from '../components/Layout.js';
import { SelectList, type SelectItem } from '../components/SelectList.js';
import { MENU_CONTROLS } from '../controls.js';
import { useHelp } from '../hooks/useHelp.js';
import { useAppState } from '../hooks/useStore.js';
import { selectExtendedStats } from '../../state/selectors.js';
import type { Screen } from './Screen.js';

const ITEMS: SelectItem<Screen>[] = [
  { value: 'study', label: '◆ Study due cards' },
  { value: 'custom-study', label: '◎ Custom study session' },
  { value: 'add', label: '+ Add new card' },
  { value: 'browse', label: '□ Browse cards' },
  { value: 'search', label: '◉ Search cards' },
  { value: 'delete', label: '× Delete card' },
  { value: 'achievements', label: '◑ Achievements' },
  { value: 'analytics', label: '◰ Analytics & history' },
  { value: 'stats', label: '◈ Quick stats' },
  { value: 'exit', label: '◐ Exit' }
];

export interface MainMenuProps {
  onSelect: (screen: Screen) => void;
}

export function MainMenu({ onSelect }: MainMenuProps) {
  const [index, setIndex] = useState(0);
  const { isHelpOpen, toggleHelp } = useHelp();
  const stats = selectExtendedStats(useAppState());

  useInput(input => {
    if (isHelpOpen) {
      return;
    }
    if (input === '?') {
      toggleHelp();
    } else if (input === 'q') {
      onSelect('exit');
    }
  });

  const streak = stats.learningStreak.currentStreak;
  const status =
    `${stats.dueCards} due · ${stats.totalCards} cards` +
    (streak > 0 ? ` · ${streak}d streak` : '');

  return (
    <Layout
      title="※ Terminal Anki"
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
