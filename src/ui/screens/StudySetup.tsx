import { useState } from 'react';
import { Box, Text } from 'ink';
import { Layout } from '../components/Layout.js';
import { SelectList, type SelectItem } from '../components/SelectList.js';
import { MOVE_CONTROL, screenControls, type Control } from '../controls.js';
import { useScreenInput } from '../hooks/useScreenInput.js';
import { useHelp } from '../hooks/useHelp.js';
import { useTheme } from '../hooks/useTheme.js';

/** `null` means the learner backed out. */
export type SessionLength = number | null;

const START_CONTROL: Control = {
  key: '⏎',
  label: 'start',
  description: 'Start studying with this many cards'
};

const SETUP_CONTROLS = screenControls([MOVE_CONTROL, START_CONTROL]);

const CUSTOM_CONTROLS = screenControls([
  { key: '←→/hl', label: '±1', description: 'Adjust the card count by one' },
  { key: '↑↓/jk', label: '±10', description: 'Adjust the card count by ten' },
  START_CONTROL
]);

const PRESETS = [10, 25, 50];
const CUSTOM = -1;

export interface StudySetupProps {
  dueCount: number;
  onStart: (length: number) => void;
  onCancel: () => void;
  onQuit: () => void;
}

export function StudySetup({ dueCount, onStart, onCancel, onQuit }: StudySetupProps) {
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

  // Clamping, not validation errors: the value simply cannot leave its range.
  const clamp = (value: number) => Math.max(1, Math.min(dueCount, value));

  useScreenInput({
    isHelpOpen,
    toggleHelp,
    // Back steps out of the stepper first, then out of the screen.
    onBack: inCustom ? () => setCustom(null) : onCancel,
    onQuit,
    onKey: (stroke, key) => {
      if (custom === null) {
        return false;
      }
      if (key.return) {
        onStart(clamp(custom));
        return true;
      }
      if (key.leftArrow || stroke === 'h') {
        setCustom(clamp(custom - 1));
      } else if (key.rightArrow || stroke === 'l') {
        setCustom(clamp(custom + 1));
      } else if (key.downArrow || stroke === 'j') {
        setCustom(clamp(custom - 10));
      } else if (key.upArrow || stroke === 'k') {
        setCustom(clamp(custom + 10));
      }
      return false;
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
