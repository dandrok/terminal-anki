import { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { Layout } from '../components/Layout.js';
import { ProgressBar } from '../components/ProgressBar.js';
import { HELP_CONTROL, type Control } from '../controls.js';
import { useHelp } from '../hooks/useHelp.js';
import { useTheme } from '../hooks/useTheme.js';
import { useDispatch } from '../hooks/useStore.js';
import { GRADE_BINDINGS, gradeForKey, DEFAULT_GRADE } from '../../core/grading.js';
import { isConfirm, splitKeystrokes } from '../keystrokes.js';
import type { Flashcard, ReviewQuality } from '../../types/index.js';

const QUESTION_CONTROLS: Control[] = [
  { key: 'space', label: 'reveal', description: 'Show the answer' },
  { key: 's', label: 'skip', description: 'Move on without grading this card' },
  { key: 'u', label: 'undo', description: 'Undo the previous grade and see that card again' },
  { key: 'q', label: 'end', description: 'End the session and see the summary' },
  HELP_CONTROL
];

const ANSWER_CONTROLS: Control[] = [
  { key: '1-5', label: 'grade', description: 'Again · Hard · Good · Easy · Perfect' },
  { key: 'space', label: 'good', description: 'Grade Good, the usual answer' },
  { key: 'u', label: 'undo', description: 'Undo the previous grade and see that card again' },
  { key: 'q', label: 'end', description: 'End the session and see the summary' },
  HELP_CONTROL
];

/** One graded card, kept so undo can rewind the counters as well as the card. */
interface GradedEntry {
  cardIndex: number;
  quality: ReviewQuality;
}

export interface SessionResult {
  studied: number;
  correctAnswers: number;
  skipped: number;
  difficulties: number[];
  quitEarly: boolean;
  startTime: Date;
}

export interface StudyProps {
  cards: readonly Flashcard[];
  onFinish: (result: SessionResult) => void;
}

export function Study({ cards, onFinish }: StudyProps) {
  const theme = useTheme();
  const dispatch = useDispatch();
  const { isHelpOpen, toggleHelp } = useHelp();

  const [startTime] = useState(() => new Date());
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [graded, setGraded] = useState<GradedEntry[]>([]);
  const [skipped, setSkipped] = useState(0);

  const card = cards[index];

  // Counters are passed in rather than read from state: when the last card is
  // graded or skipped, the setState for that very action has not committed yet.
  const finish = (
    quitEarly: boolean,
    entries: GradedEntry[] = graded,
    skippedCount: number = skipped
  ): void => {
    onFinish({
      studied: entries.length,
      correctAnswers: entries.filter(entry => entry.quality >= 3).length,
      skipped: skippedCount,
      // Inverted so 0 is easiest and 5 is hardest.
      difficulties: entries.map(entry => 5 - entry.quality),
      quitEarly,
      startTime
    });
  };

  const advance = (entries: GradedEntry[], skippedCount: number = skipped): void => {
    setRevealed(false);
    if (index + 1 >= cards.length) {
      finish(false, entries, skippedCount);
    } else {
      setIndex(index + 1);
    }
  };

  const grade = (quality: ReviewQuality): void => {
    if (!card) {
      return;
    }
    dispatch({ type: 'card/grade', id: card.id, quality, now: new Date() });
    const entries = [...graded, { cardIndex: index, quality }];
    setGraded(entries);
    advance(entries);
  };

  const undo = (): void => {
    const last = graded.at(-1);
    if (!last) {
      return;
    }
    dispatch({ type: 'undo' });
    setGraded(graded.slice(0, -1));
    // Step back to the card that was undone, so it is seen again.
    setIndex(last.cardIndex);
    setRevealed(false);
  };

  /**
   * Apply one keystroke.
   *
   * Returns the revealed flag to use for the next stroke in the same chunk, and
   * whether to stop. Anything that moves to another card stops: React state has
   * not committed yet, so a following stroke would still be looking at the card
   * just graded.
   */
  const handleStroke = (
    stroke: string,
    confirm: boolean,
    escape: boolean,
    isRevealed: boolean
  ): { revealed: boolean; stop: boolean } => {
    if (stroke === '?') {
      toggleHelp();
      return { revealed: isRevealed, stop: true };
    }
    if (stroke === 'q' || escape) {
      finish(true);
      return { revealed: isRevealed, stop: true };
    }
    if (stroke === 'u') {
      undo();
      return { revealed: false, stop: true };
    }

    if (!isRevealed) {
      if (confirm || stroke === ' ') {
        setRevealed(true);
        return { revealed: true, stop: false };
      }
      if (stroke === 's') {
        const skippedCount = skipped + 1;
        setSkipped(skippedCount);
        advance(graded, skippedCount);
        return { revealed: false, stop: true };
      }
      return { revealed: isRevealed, stop: false };
    }

    // Two fixed keystrokes per card: reveal, then a digit. The digits never
    // move, unlike a menu whose positions depend on what happens to be listed.
    const binding = gradeForKey(stroke) ?? (confirm || stroke === ' ' ? DEFAULT_GRADE : undefined);
    if (binding) {
      grade(binding.quality);
      return { revealed: false, stop: true };
    }
    return { revealed: isRevealed, stop: false };
  };

  useInput((input, key) => {
    if (isHelpOpen) {
      return;
    }

    const strokes = splitKeystrokes(input);
    // Threaded by hand: React state has not committed between strokes that
    // arrived in the same read.
    let isRevealed = revealed;
    for (const stroke of strokes) {
      const single = strokes.length === 1;
      const result = handleStroke(
        stroke,
        single ? key.return : isConfirm(stroke),
        single ? key.escape : false,
        isRevealed
      );
      isRevealed = result.revealed;
      if (result.stop) {
        break;
      }
    }
  });

  if (!card) {
    return null;
  }

  const accuracy =
    graded.length > 0
      ? Math.round((graded.filter(entry => entry.quality >= 3).length / graded.length) * 100)
      : null;

  const status =
    `${index + 1}/${cards.length}` + (accuracy === null ? '' : ` · ${accuracy}% correct`);

  return (
    <Layout
      title="◆ Studying"
      status={status}
      controls={revealed ? ANSWER_CONTROLS : QUESTION_CONTROLS}
      isHelpOpen={isHelpOpen}
    >
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <ProgressBar current={index} total={cards.length} width={24} />
        </Box>

        <Text bold color={theme.text}>
          {card.front}
        </Text>

        {card.tags.length > 0 ? <Text color={theme.muted}>◈ {card.tags.join(', ')}</Text> : null}

        {revealed ? (
          <Box flexDirection="column" marginTop={1}>
            <Text color={theme.muted}>{'─'.repeat(24)}</Text>
            <Text color={theme.success}>{card.back}</Text>

            <Box marginTop={1} gap={2}>
              {GRADE_BINDINGS.map(binding => (
                <Text key={binding.key} color={theme[binding.tone]}>
                  [{binding.key}] {binding.label}
                </Text>
              ))}
            </Box>
          </Box>
        ) : (
          <Box marginTop={1}>
            <Text color={theme.muted}>press space to reveal</Text>
          </Box>
        )}
      </Box>
    </Layout>
  );
}
