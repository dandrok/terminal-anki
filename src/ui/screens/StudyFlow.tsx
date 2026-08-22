import { useState } from 'react';
import { Box, Text } from 'ink';
import { Layout } from '../components/Layout.js';
import { StudySetup } from './StudySetup.js';
import { Study, type SessionResult } from './Study.js';
import { SessionSummary } from './SessionSummary.js';
import { READONLY_CONTROLS } from '../controls.js';
import { useHelp } from '../hooks/useHelp.js';
import { useScreenInput } from '../hooks/useScreenInput.js';
import { useTheme } from '../hooks/useTheme.js';
import { useAppState, useDispatch } from '../hooks/useStore.js';
import { selectDueCards } from '../../state/selectors.js';
import { shuffle } from '../../core/filters.js';
import type { Flashcard } from '../../types/index.js';

type Phase =
  | { name: 'setup' }
  | { name: 'studying'; cards: readonly Flashcard[] }
  | { name: 'summary'; result: SessionResult; skipped: number };

function NothingDue({ onDone, onQuit }: { onDone: () => void; onQuit: () => void }) {
  const theme = useTheme();
  const { isHelpOpen, toggleHelp } = useHelp();
  // Previously fired on *any* key, so `?` exited instead of opening help.
  useScreenInput({ isHelpOpen, toggleHelp, onBack: onDone, onQuit });

  return (
    <Layout title="◆ Study" controls={READONLY_CONTROLS} isHelpOpen={isHelpOpen}>
      <Box flexDirection="column">
        <Text color={theme.success}>No cards due for review.</Text>
      </Box>
    </Layout>
  );
}

export interface StudyFlowProps {
  onExit: () => void;
  onQuit: () => void;
}

/**
 * Owns the setup → study → summary sequence.
 *
 * Kept as one component rather than three routes so the session's cards and
 * counters never have to be lifted into the router.
 */
export function StudyFlow({ onExit, onQuit }: StudyFlowProps) {
  const state = useAppState();
  const dispatch = useDispatch();
  const [phase, setPhase] = useState<Phase>({ name: 'setup' });

  // Snapshotted once, so grading a card during the session cannot change the
  // pool underneath the learner.
  const [due] = useState(() => selectDueCards(state));

  const finish = (result: SessionResult): void => {
    // Recording a session marks today as a study day, so an aborted session
    // that graded nothing must not count.
    if (result.studied > 0) {
      dispatch({
        type: 'session/record',
        now: new Date(),
        session: {
          startTime: result.startTime,
          endTime: new Date(),
          cardsStudied: result.studied,
          correctAnswers: result.correctAnswers,
          incorrectAnswers: result.studied - result.correctAnswers,
          averageDifficulty:
            result.difficulties.length > 0
              ? result.difficulties.reduce((sum, value) => sum + value, 0) /
                result.difficulties.length
              : 0,
          sessionType: 'due',
          quitEarly: result.quitEarly
        }
      });
    }
    setPhase({ name: 'summary', result, skipped: result.skipped });
  };

  if (due.length === 0) {
    return <NothingDue onDone={onExit} onQuit={onQuit} />;
  }

  switch (phase.name) {
    case 'setup':
      return (
        <StudySetup
          dueCount={due.length}
          onQuit={onQuit}
          onCancel={onExit}
          onStart={length => {
            setPhase({ name: 'studying', cards: shuffle(due).slice(0, length) });
          }}
        />
      );

    case 'studying':
      return <Study cards={phase.cards} onFinish={finish} />;

    case 'summary':
      return (
        <SessionSummary
          studied={phase.result.studied}
          correctAnswers={phase.result.correctAnswers}
          skipped={phase.skipped}
          // Recounted from the collection rather than subtracted from the
          // starting total, so cards graded "Again" are included.
          remainingDue={selectDueCards(state).length}
          quitEarly={phase.result.quitEarly}
          onDone={onExit}
          onQuit={onQuit}
        />
      );
  }
}
