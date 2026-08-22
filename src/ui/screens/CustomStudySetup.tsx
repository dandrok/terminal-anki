import { useState } from 'react';
import { Box, Text } from 'ink';
import { Layout } from '../components/Layout.js';
import { screenControls, type Control } from '../controls.js';
import { useHelp } from '../hooks/useHelp.js';
import { useScreenInput } from '../hooks/useScreenInput.js';
import { useTheme } from '../hooks/useTheme.js';
import { plural } from '../format.js';
import type { CustomStudyFilters, DifficultyLevel } from '../../types/index.js';

const DIFFICULTIES: (DifficultyLevel | null)[] = [null, 'new', 'learning', 'young', 'mature'];
const LIMITS: (number | null)[] = [null, 10, 25, 50];

const FIELDS = ['scope', 'tags', 'difficulty', 'limit', 'order'] as const;
type Field = (typeof FIELDS)[number];

const SETUP_CONTROLS: Control[] = screenControls([
  { key: '↑↓/jk', label: 'field', description: 'Move between filters' },
  { key: '←→/hl', label: 'change', description: 'Change the highlighted filter' },
  { key: 'space', label: 'toggle', description: 'Toggle a tag on or off' },
  { key: '⏎', label: 'start', description: 'Start studying with these filters' }
]);

export interface CustomStudySetupProps {
  allTags: readonly string[];
  /** How many cards the current filters would select. */
  matchCount: (filters: CustomStudyFilters) => number;
  onStart: (filters: CustomStudyFilters) => void;
  onCancel: () => void;
}

/**
 * Build the filter set for a custom session.
 *
 * The chosen scope is folded into the returned filters as `dueOnly`, rather
 * than being asked for and then dropped — which is what made "study due cards
 * with filters" behave identically to "study all cards" in v1.
 */
export function CustomStudySetup({
  allTags,
  matchCount,
  onStart,
  onCancel
}: CustomStudySetupProps) {
  const theme = useTheme();
  const { isHelpOpen, toggleHelp } = useHelp();

  const [fieldIndex, setFieldIndex] = useState(0);
  const [dueOnly, setDueOnly] = useState(true);
  const [tagIndex, setTagIndex] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [difficultyIndex, setDifficultyIndex] = useState(0);
  const [limitIndex, setLimitIndex] = useState(0);
  const [randomOrder, setRandomOrder] = useState(true);

  const field: Field = FIELDS[fieldIndex];
  const difficulty = DIFFICULTIES[difficultyIndex];
  const limit = LIMITS[limitIndex];

  const filters: CustomStudyFilters = {
    dueOnly,
    ...(selectedTags.length > 0 ? { tags: selectedTags } : {}),
    ...(difficulty ? { difficulty } : {}),
    ...(limit ? { limit } : {}),
    randomOrder
  };

  const matches = matchCount(filters);

  const cycle = (delta: number): void => {
    const wrap = (value: number, length: number) => (value + delta + length) % length;
    switch (field) {
      case 'scope':
        setDueOnly(!dueOnly);
        break;
      case 'tags':
        if (allTags.length > 0) {
          setTagIndex(wrap(tagIndex, allTags.length));
        }
        break;
      case 'difficulty':
        setDifficultyIndex(wrap(difficultyIndex, DIFFICULTIES.length));
        break;
      case 'limit':
        setLimitIndex(wrap(limitIndex, LIMITS.length));
        break;
      case 'order':
        setRandomOrder(!randomOrder);
        break;
    }
  };

  const toggleTag = (): void => {
    const tag = allTags[tagIndex];
    if (field !== 'tags' || !tag) {
      return;
    }
    setSelectedTags(
      selectedTags.includes(tag)
        ? selectedTags.filter(entry => entry !== tag)
        : [...selectedTags, tag]
    );
  };

  useScreenInput({
    isHelpOpen,
    toggleHelp,
    onBack: onCancel,
    onKey: (stroke, key) => {
      if (key.return) {
        if (matches > 0) {
          onStart(filters);
        }
        return true;
      }
      if (stroke === ' ') {
        toggleTag();
        return true;
      }
      if (key.upArrow || stroke === 'k') {
        setFieldIndex((fieldIndex - 1 + FIELDS.length) % FIELDS.length);
      } else if (key.downArrow || stroke === 'j') {
        setFieldIndex((fieldIndex + 1) % FIELDS.length);
      } else if (key.leftArrow || stroke === 'h') {
        cycle(-1);
      } else if (key.rightArrow || stroke === 'l') {
        cycle(1);
      }
      return false;
    }
  });

  const row = (name: Field, label: string, value: string) => {
    const isActive = name === field;
    return (
      <Box key={name}>
        <Text color={isActive ? theme.primary : theme.muted}>{isActive ? '❯ ' : '  '}</Text>
        <Text color={isActive ? theme.primary : theme.muted}>{`${label}:`.padEnd(12)}</Text>
        {/* Affordances only on the active row, with the space reserved either
            way so moving the cursor never shifts the layout. */}
        <Text color={isActive ? theme.text : theme.muted} bold={isActive}>
          {isActive ? '◀ ' : '  '}
          {value}
          {isActive ? ' ▶' : '  '}
        </Text>
      </Box>
    );
  };

  const tagLabel =
    allTags.length === 0
      ? 'no tags yet'
      : `${selectedTags.includes(allTags[tagIndex] ?? '') ? '☑' : '☐'} ${allTags[tagIndex]}` +
        (selectedTags.length > 0 ? `  (${selectedTags.length} selected)` : '');

  return (
    <Layout
      title="◎ Custom study"
      status={matches > 0 ? `${plural(matches, 'card')} match` : 'nothing matches'}
      controls={SETUP_CONTROLS}
      isHelpOpen={isHelpOpen}
    >
      <Box flexDirection="column">
        {row('scope', 'Scope', dueOnly ? 'due cards only' : 'all cards')}
        {row('tags', 'Tags', tagLabel)}
        {row('difficulty', 'Difficulty', difficulty ?? 'any')}
        {row('limit', 'Limit', limit === null ? 'all matching' : `${limit} cards`)}
        {row('order', 'Order', randomOrder ? 'shuffled' : 'as listed')}

        <Box marginTop={1}>
          <Text color={matches > 0 ? theme.success : theme.error}>
            {matches > 0
              ? `⏎ starts a session of ${plural(matches, 'card')}`
              : 'Nothing matches these filters.'}
          </Text>
        </Box>
      </Box>
    </Layout>
  );
}
