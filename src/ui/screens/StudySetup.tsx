import { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { Layout } from '../components/Layout.js';
import { SelectList, type SelectItem } from '../components/SelectList.js';
import { HELP_CONTROL, type Control } from '../controls.js';
import { useHelp } from '../hooks/useHelp.js';
import { useTheme } from '../hooks/useTheme.js';

/** `null` means the learner backed out. */
export type SessionLength = number | null;

const SETUP_CONTROLS: Control[] = [
  { key: '↑↓/jk', label: 'move', description: 'Move between session sizes' },
  { key: '⏎', label: 'start', description: 'Start studying with the highlighted size' },
  { key: 'esc', label: 'cancel', description: 'Return to the menu without studying' },
  HELP_CONTROL
];

const CUSTOM_CONTROLS: Control[] = [
  { key: '←→/hl', label: '±1', description: 'Adjust the card count by one' },
  { key: '↑↓/jk', label: '±10', description: 'Adjust the card count by ten' },
  { key: '⏎', label: 'start', description: 'Start studying this many cards' },
  { key: 'esc', label: 'back', description: 'Return to the session sizes' },
  HELP_CONTROL
];

const PRESETS = [10, 25, 50];
const CUSTOM = -1;

export interface StudySetupProps {
  dueCount: number;
  onStart: (length: number) => void;
  onCancel: () => void;
}

export function StudySetup({ dueCount, onStart, onCancel }: StudySetupProps) {
  const theme = useTheme();
  const { isHelpOpen, toggleHelp } = useHelp();
  const [index, setIndex] = useState(0);
  const [custom, setCustom] = useState<number | null>(null);

  const items: SelectItem<number>[] = [
    { value: dueCount, label: `Study all due cards`, hint: `(${dueCount})` },
    ...PRESETS.filter(size => size < dueCount).map(size => ({
      value: size,
      label: `Study ${size} cards`
    })),
    { value: CUSTOM, label: 'Custom number…' }
  ];

  const inCustom = custom !== null;

  useInput((input, key) => {
    if (isHelpOpen) {
      return;
    }
    if (input === '?') {
      toggleHelp();
      return;
    }

    if (!inCustom) {
      if (key.escape) {
        onCancel();
      }
      return;
    }

    // Clamping, not validation errors: the value simply cannot leave its range.
    const clamp = (value: number) => Math.max(1, Math.min(dueCount, value));

    if (key.escape) {
      setCustom(null);
    } else if (key.return) {
      onStart(clamp(custom));
    } else if (key.leftArrow || input === 'h') {
      setCustom(clamp(custom - 1));
    } else if (key.rightArrow || input === 'l') {
      setCustom(clamp(custom + 1));
    } else if (key.downArrow || input === 'j') {
      setCustom(clamp(custom - 10));
    } else if (key.upArrow || input === 'k') {
      setCustom(clamp(custom + 10));
    }
  });

  if (inCustom) {
    return (
      <Layout
        title="◆ Study"
        status={`${dueCount} due`}
        controls={CUSTOM_CONTROLS}
        isHelpOpen={isHelpOpen}
      >
        <Box flexDirection="column">
          <Text color={theme.muted}>How many cards?</Text>
          <Box marginTop={1}>
            <Text color={theme.primary}>◀ </Text>
            <Text bold color={theme.primary}>
              {custom}
            </Text>
            <Text color={theme.primary}> ▶</Text>
            <Text color={theme.muted}> of {dueCount}</Text>
          </Box>
        </Box>
      </Layout>
    );
  }

  return (
    <Layout
      title="◆ Study"
      status={`${dueCount} due`}
      controls={SETUP_CONTROLS}
      isHelpOpen={isHelpOpen}
    >
      <SelectList
        items={items}
        selectedIndex={index}
        onMove={setIndex}
        onSelect={value => {
          if (value === CUSTOM) {
            setCustom(Math.min(dueCount, 10));
          } else {
            onStart(value);
          }
        }}
        isActive={!isHelpOpen}
      />
    </Layout>
  );
}
