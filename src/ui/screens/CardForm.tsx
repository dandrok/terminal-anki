import { useState } from 'react';
import { Box, Text } from 'ink';
import { Layout } from '../components/Layout.js';
import { TextField, applyKey, DEFAULT_MAX_LENGTH } from '../components/TextField.js';
import { screenControls, type Control } from '../controls.js';
import { useHelp } from '../hooks/useHelp.js';
import { useScreenInput } from '../hooks/useScreenInput.js';
import { useTheme } from '../hooks/useTheme.js';
import { isConfirm } from '../keystrokes.js';
import type { Flashcard } from '../../types/index.js';

const FIELDS = ['front', 'back', 'tags'] as const;
type Field = (typeof FIELDS)[number];

const LABELS: Record<Field, string> = {
  front: 'Front',
  back: 'Back',
  tags: 'Tags'
};

const PLACEHOLDERS: Record<Field, string> = {
  front: 'the question…',
  back: 'the answer…',
  tags: 'comma, separated, optional'
};

const FORM_CONTROLS: Control[] = screenControls([
  { key: '⏎', label: 'next', description: 'Move to the next field, or save on the last one' },
  { key: '↑↓', label: 'field', description: 'Move between fields' },
  { key: '^s', label: 'save', description: 'Save from any field' }
]);

export interface CardDraft {
  front: string;
  back: string;
  tags: string[];
}

export interface CardFormProps {
  /** Supplied when editing; absent when adding. */
  card?: Flashcard;
  onSave: (draft: CardDraft) => void;
  onCancel: () => void;
}

/**
 * Add or edit a card.
 *
 * One component for both, because the only difference is where the initial
 * values come from. Editing had no screen at all before this — `card/edit` was
 * reachable only from tests.
 */
export function CardForm({ card, onSave, onCancel }: CardFormProps) {
  const theme = useTheme();
  const { isHelpOpen, toggleHelp } = useHelp();

  const [values, setValues] = useState<Record<Field, string>>(() => ({
    front: card?.front ?? '',
    back: card?.back ?? '',
    tags: card?.tags.join(', ') ?? ''
  }));
  const [fieldIndex, setFieldIndex] = useState(0);

  const field = FIELDS[fieldIndex];
  const isValid = values.front.trim().length > 0 && values.back.trim().length > 0;

  const save = (): void => {
    if (!isValid) {
      return;
    }
    onSave({
      front: values.front.trim(),
      back: values.back.trim(),
      tags: values.tags.split(',')
    });
  };

  useScreenInput({
    isHelpOpen,
    toggleHelp,
    onBack: onCancel,
    // Typing must win: `?` is a character here, not the help key.
    isTextInput: true,
    onKey: (stroke, key) => {
      // Ink reports this as input "s" with ctrl set.
      if (key.ctrl && stroke === 's') {
        save();
        return true;
      }
      if (key.upArrow) {
        setFieldIndex((fieldIndex - 1 + FIELDS.length) % FIELDS.length);
        return true;
      }
      if (key.downArrow || key.tab) {
        setFieldIndex((fieldIndex + 1) % FIELDS.length);
        return true;
      }
      if (key.return || isConfirm(stroke)) {
        if (fieldIndex === FIELDS.length - 1) {
          save();
        } else {
          setFieldIndex(fieldIndex + 1);
        }
        return true;
      }

      const next = applyKey(values[field], stroke, key, DEFAULT_MAX_LENGTH);
      if (next !== values[field]) {
        setValues({ ...values, [field]: next });
      }
      return false;
    }
  });

  return (
    <Layout
      title={card ? '✎ Edit card' : '+ New card'}
      status={isValid ? undefined : 'front and back are required'}
      controls={FORM_CONTROLS}
      isHelpOpen={isHelpOpen}
    >
      <Box flexDirection="column">
        {FIELDS.map((name, index) => {
          const isActive = index === fieldIndex;
          return (
            <Box key={name}>
              <Text color={isActive ? theme.primary : theme.muted}>{isActive ? '❯ ' : '  '}</Text>
              <Text color={isActive ? theme.primary : theme.muted}>
                {`${LABELS[name]}:`.padEnd(8)}
              </Text>
              <TextField
                value={values[name]}
                placeholder={PLACEHOLDERS[name]}
                isActive={isActive}
              />
            </Box>
          );
        })}
      </Box>
    </Layout>
  );
}
