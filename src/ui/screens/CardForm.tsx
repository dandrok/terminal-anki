import { useMemo, useRef, useState } from 'react';
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

  const initial = useMemo<Record<Field, string>>(
    () => ({
      front: card?.front ?? '',
      back: card?.back ?? '',
      tags: card?.tags.join(', ') ?? ''
    }),
    [card]
  );

  const [values, setValues] = useState(initial);
  const [fieldIndex, setFieldIndex] = useState(0);

  /**
   * The form as it stands mid-chunk.
   *
   * Ink hands over everything that arrived in one read as a single string, so
   * typing quickly — or pasting — delivers "abc" or even "front\rback\r" at
   * once, and every keystroke in it is processed before React commits any of
   * them. Reading `values` from the render closure therefore saw the same stale
   * form for each character and kept only the last one. The handler is the only
   * writer of either piece of state, so this ref and the state stay in step.
   */
  const draft = useRef({ values: initial, fieldIndex: 0 });

  const isValid = values.front.trim().length > 0 && values.back.trim().length > 0;

  /** Returns whether it saved, so the caller knows the screen is going away. */
  const save = (): boolean => {
    const pending = draft.current.values;
    if (pending.front.trim().length === 0 || pending.back.trim().length === 0) {
      return false;
    }
    onSave({
      front: pending.front.trim(),
      back: pending.back.trim(),
      tags: pending.tags.split(',')
    });
    return true;
  };

  const moveTo = (index: number): void => {
    draft.current.fieldIndex = (index + FIELDS.length) % FIELDS.length;
    setFieldIndex(draft.current.fieldIndex);
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
        return save();
      }
      // Moves do not stop the chunk: the draft ref already carries the new
      // field, so a pasted "front⏎back⏎tags⏎" fills the whole form in one go
      // instead of stopping dead after the first return. Only a successful save
      // stops, because by then the screen is gone.
      if (key.upArrow) {
        moveTo(draft.current.fieldIndex - 1);
        return false;
      }
      if (key.downArrow || key.tab) {
        moveTo(draft.current.fieldIndex + 1);
        return false;
      }
      if (key.return || isConfirm(stroke)) {
        if (draft.current.fieldIndex === FIELDS.length - 1) {
          return save();
        }
        moveTo(draft.current.fieldIndex + 1);
        return false;
      }

      const active = FIELDS[draft.current.fieldIndex];
      const next = applyKey(draft.current.values[active], stroke, key, DEFAULT_MAX_LENGTH);
      if (next !== draft.current.values[active]) {
        draft.current.values = { ...draft.current.values, [active]: next };
        setValues(draft.current.values);
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
