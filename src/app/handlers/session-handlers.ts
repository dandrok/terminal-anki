import { select, isCancel } from '@clack/prompts';
import {
  Flashcard,
  ReviewQuality,
  CustomStudyFilters,
  StudySessionRecord
} from '../../features/flashcards/domain';
import {
  processCardReview,
  recordAndProcessStudySession
} from '../../features/flashcards/services/flashcard-service';

async function waitForAnswer(
  _card: Flashcard,
  _currentIndex: number,
  _totalCards: number
): Promise<'show' | 'quit' | 'skip'> {
  console.log('\nChoose your action:');

  const action = await select({
    message: '',
    options: [
      { value: 'show', label: '◉ Show Answer' },
      { value: 'skip', label: '◐ Skip Card' },
      { value: 'quit', label: '× Quit Session' }
    ]
  });

  if (isCancel(action)) {
    return 'quit';
  }

  return action as 'show' | 'quit' | 'skip';
}

async function getDifficultyRating(
  _card: Flashcard,
  _currentIndex: number,
  _totalCards: number
): Promise<ReviewQuality | 'quit'> {
  const difficulty = await select({
    message: 'How well did you know this?',
    options: [
      { value: 0, label: '× Again (0) - Show card soon' },
      { value: 1, label: '◐ Hard (1)' },
      { value: 3, label: '◑ Good (3)' },
      { value: 4, label: '◒ Easy (4)' },
      { value: 'quit', label: '× Quit Session' }
    ]
  });

  if (isCancel(difficulty)) {
    return 'quit';
  }

  // Handle quit option separately since return type differs
  if (difficulty === 'quit') {
    return 'quit';
  }

  return difficulty as ReviewQuality;
}

function showSessionSummary(
  studiedCount: number,
  remainingInSession: number,
  totalRemainingDue: number,
  quitEarly: boolean
): void {
  console.log('\n' + '='.repeat(50));
  console.log('◎ Session Summary');
  console.log('='.repeat(50));
  console.log(`✓ Studied: ${studiedCount} cards`);
  if (quitEarly) {
    console.log(`◰ Skipped in session: ${remainingInSession} cards`);
  }
  console.log(`◉ Remaining due today: ${totalRemainingDue} cards`);
  console.log('◈ Progress saved automatically');

  if (quitEarly) {
    console.log('\n○ See you next time!');
  } else {
    console.log('\n★ Great job! Keep up the good work!');
  }
  console.log('='.repeat(50));
}

export async function runStudySession(
  sessionCards: Flashcard[],
  totalAvailableCards: number,
  sessionType: 'due' | 'custom' | 'all',
  customFilters?: CustomStudyFilters
): Promise<void> {
  const startTime = new Date();
  let correctAnswers = 0;
  let studiedCount = 0;
  let quitEarly = false;
  const totalDifficulty: number[] = [];

  console.log(
    `\n◐ Starting ${sessionType === 'custom' ? 'custom' : sessionType} study session with ${sessionCards.length} cards...`
  );
  console.log('-'.repeat(50));

  for (let i = 0; i < sessionCards.length; i++) {
    const card = sessionCards[i];

    // Show question
    console.log(`\n○ Card ${i + 1}/${sessionCards.length}`);
    console.log(`Question: ${card.front}`);

    // Wait for user to show answer or quit
    const shouldContinue = await waitForAnswer(card, i, sessionCards.length);
    if (shouldContinue === 'quit') {
      quitEarly = true;
      break;
    } else if (shouldContinue === 'skip') {
      continue;
    }

    // Show answer
    console.log(`\nAnswer: ${card.back}`);

    // Get difficulty rating
    const rating = await getDifficultyRating(card, i, sessionCards.length);
    if (rating === 'quit') {
      quitEarly = true;
      break;
    } else {
      processCardReview(card.id, rating);
      studiedCount++;
      totalDifficulty.push(5 - rating); // Invert for difficulty calculation (0=hardest, 5=easiest)

      if (rating >= 3) {
        correctAnswers++;
      }
    }
  }

  // Record session data
  const endTime = new Date();
  const averageDifficulty =
    totalDifficulty.length > 0
      ? totalDifficulty.reduce((a, b) => a + b, 0) / totalDifficulty.length
      : 0;

  const sessionData: Omit<StudySessionRecord, 'id'> = {
    startTime,
    endTime,
    duration: endTime.getTime() - startTime.getTime(),
    cardsStudied: studiedCount,
    correctAnswers,
    incorrectAnswers: studiedCount - correctAnswers,
    averageDifficulty,
    sessionType,
    customFilters: customFilters
      ? {
          tags: customFilters.tags,
          difficulty: customFilters.difficulty
        }
      : undefined,
    quitEarly
  };

  recordAndProcessStudySession(sessionData);

  // Show session summary
  showSessionSummary(
    studiedCount,
    sessionCards.length - studiedCount,
    totalAvailableCards - studiedCount,
    quitEarly
  );
}
