import { useRef, useState } from 'react';
import { Box, Text } from 'ink';
import { Layout } from '../components/Layout.js';
import { CardText } from '../components/CardText.js';
import { ConfirmDialog } from '../components/ConfirmDialog.js';
import { TextField, applyKey } from '../components/TextField.js';
import { screenControls, type Control } from '../controls.js';
import { useHelp } from '../hooks/useHelp.js';
import { useScreenInput } from '../hooks/useScreenInput.js';
import { useTheme } from '../hooks/useTheme.js';
import { useAppState, useDispatch } from '../hooks/useStore.js';
import { selectCanUndo, selectCards, selectSearchResults } from '../../state/selectors.js';
import { difficultyOf, isDue } from '../../core/sm2.js';
import { truncate } from '../format.js';
import { describeMedia } from '../../core/media.js';
import type { Flashcard } from '../../types/index.js';

/** How many rows fit around the header, footer and detail block. */
const VISIBLE_ROWS = 8;

const BROWSE_CONTROLS: Control[] = screenControls([
  { key: '↑↓/jk', label: 'move', description: 'Move between cards' },
  { key: '⏎', label: 'answer', description: 'Show or hide the answer' },
  { key: '/', label: 'filter', description: 'Filter the list as you type' },
  { key: 'e', label: 'edit', description: 'Edit the highlighted card' },
  { key: 'd', label: 'delete', description: 'Delete the highlighted card' },
  { key: 'u', label: 'undo', description: 'Undo the last delete or edit' }
]);

const FILTER_CONTROLS: Control[] = screenControls(
  [{ key: '⏎', label: 'done', description: 'Keep the filter and return to the list' }],
  { isTextInput: true }
);

/**
 * While the delete prompt is up, only these keys do anything.
 *
 * The footer used to keep listing the browse keys, so it advertised j, k, e and
 * u at the exact moment none of them worked.
 */
const CONFIRM_CONTROLS: Control[] = screenControls([
  { key: 'y', label: 'delete', description: 'Delete the card for good' },
  { key: 'n', label: 'keep', description: 'Keep the card and return to the list' }
]);

export interface BrowseProps {
  onBack: () => void;
  onEdit: (card: Flashcard) => void;
  /** Restrict to cards matching this query on entry, for the search route. */
  initialQuery?: string;
}

export function Browse({ onBack, onEdit, initialQuery }: BrowseProps) {
  const theme = useTheme();
  const state = useAppState();
  const dispatch = useDispatch();
  const { isHelpOpen, toggleHelp } = useHelp();

  const [query, setQuery] = useState(initialQuery ?? '');
  const [filtering, setFiltering] = useState(initialQuery !== undefined);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const cards = query.trim() ? selectSearchResults(state, query) : [...selectCards(state)];

  const clamped = Math.min(index, Math.max(0, cards.length - 1));
  const card = cards[clamped];

  /**
   * The filter text as it stands mid-chunk.
   *
   * Ink hands over everything that arrived in one read at once, so typing
   * quickly delivers several characters in a single callback and none of them
   * are committed while the rest are handled. Folding each one into the render
   * closure's `query` kept only the last character typed.
   */
  const pendingQuery = useRef(query);

  const move = (delta: number): void => {
    if (cards.length === 0) {
      return;
    }
    // Off the pending index, so "jjj" in one chunk moves three rows.
    setIndex(current => {
      const from = Math.min(current, Math.max(0, cards.length - 1));
      return (from + delta + cards.length) % cards.length;
    });
    setRevealed(false);
  };

  const confirmDelete = (): void => {
    if (!card) {
      return;
    }
    dispatch({ type: 'card/delete', id: card.id, now: new Date() });
    setConfirming(false);
    setRevealed(false);
    // Stay put: the next card slides into this row, which is what a list does.
    setIndex(Math.min(clamped, Math.max(0, cards.length - 2)));
  };

  useScreenInput({
    isHelpOpen,
    toggleHelp,
    onBack: () => {
      if (confirming) {
        setConfirming(false);
      } else if (filtering) {
        setFiltering(false);
      } else {
        onBack();
      }
    },
    isTextInput: filtering,
    onKey: (stroke, key) => {
      if (confirming) {
        if (stroke === 'y') {
          confirmDelete();
        } else if (stroke === 'n') {
          setConfirming(false);
        }
        return true;
      }

      if (filtering) {
        if (key.return) {
          setFiltering(false);
          return true;
        }
        const next = applyKey(pendingQuery.current, stroke, key, 60);
        if (next !== pendingQuery.current) {
          pendingQuery.current = next;
          setQuery(next);
          setIndex(0);
        }
        return false;
      }

      if (key.upArrow || stroke === 'k') {
        move(-1);
      } else if (key.downArrow || stroke === 'j') {
        move(1);
      } else if (key.return) {
        setRevealed(current => !current);
      } else if (stroke === '/') {
        setFiltering(true);
      } else if (stroke === 'e' && card) {
        onEdit(card);
      } else if (stroke === 'd' && card) {
        setConfirming(true);
      } else if (stroke === 'u') {
        dispatch({ type: 'undo', now: new Date() });
      }
      return false;
    }
  });

  const total = selectCards(state).length;
  const status = query.trim() ? `${cards.length} of ${total} match` : `${total} cards`;

  if (confirming && card) {
    return (
      <Layout title="□ Browse" status={status} controls={CONFIRM_CONTROLS} isHelpOpen={isHelpOpen}>
        <ConfirmDialog
          question="Delete this card?"
          detail={truncate(card.front, 50)}
          confirmLabel="delete"
        />
      </Layout>
    );
  }

  // Keep the cursor inside the window as it moves down a long list.
  const start = Math.max(
    0,
    Math.min(clamped - Math.floor(VISIBLE_ROWS / 2), cards.length - VISIBLE_ROWS)
  );
  const window = cards.slice(Math.max(0, start), Math.max(0, start) + VISIBLE_ROWS);

  return (
    <Layout
      title="□ Browse"
      status={status}
      controls={filtering ? FILTER_CONTROLS : BROWSE_CONTROLS}
      isHelpOpen={isHelpOpen}
    >
      <Box flexDirection="column">
        <Box>
          <Text color={filtering ? theme.primary : theme.muted}>/ </Text>
          <TextField value={query} placeholder="filter…" isActive={filtering} width={40} />
        </Box>

        <Box flexDirection="column" marginTop={1}>
          {cards.length === 0 ? (
            <Text italic color={theme.muted}>
              {query.trim() ? 'Nothing matches that filter.' : 'No cards yet.'}
            </Text>
          ) : (
            window.map(entry => {
              const isSelected = entry.id === card?.id;
              const bucket = difficultyOf(entry);
              return (
                <Box key={entry.id}>
                  <Text color={isSelected ? theme.primary : theme.muted}>
                    {isSelected ? '❯ ' : '  '}
                  </Text>
                  <Text color={theme[bucket]}>{isDue(entry) ? '●' : '○'} </Text>
                  <Text color={isSelected ? theme.text : theme.muted} bold={isSelected}>
                    {/* One line per card here, so a picture is named rather
                        than drawn — a row is not the place for one. */}
                    {truncate(describeMedia(entry.front), 44)}
                  </Text>
                </Box>
              );
            })
          )}
        </Box>

        {card ? (
          <Box flexDirection="column" marginTop={1}>
            <Text color={theme.muted}>{'─'.repeat(46)}</Text>
            {revealed ? (
              // Sized smaller than the study screen: this sits under a list.
              <CardText value={card.back} color={theme.success} maxColumns={32} maxRows={8} />
            ) : (
              <Text color={theme.muted}>press ⏎ to show the answer</Text>
            )}
            <Text color={theme.muted}>
              {difficultyOf(card)} · {card.repetitions} reviews · ease {card.easiness.toFixed(2)}
              {card.tags.length > 0 ? ` · ${card.tags.join(', ')}` : ''}
            </Text>
            {selectCanUndo(state) ? (
              <Text color={theme.warning}>u undoes the last change</Text>
            ) : null}
          </Box>
        ) : null}
      </Box>
    </Layout>
  );
}
