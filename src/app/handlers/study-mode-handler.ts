import { select, text, isCancel } from '@clack/prompts';
import { getDueCards } from '../../features/flashcards/services/flashcard-service';
import { showSuccess } from '../../ui/utils/cli-utils';
import { runStudySession } from './session-handlers';

async function setupStudySession(totalDueCards: number): Promise<number | null> {
  console.log(`
◉ ${totalDueCards} cards due today
`);

  const sessionType = await select({
    message: 'Study options:',
    options: [
      { value: 'all', label: `◆ Study all due cards (${totalDueCards})` },
      { value: 'limited', label: '◈ Study limited session' },
      { value: 'cancel', label: '◐ Cancel' }
    ]
  });

  if (sessionType === 'cancel' || isCancel(sessionType)) {
    return null;
  }

  if (sessionType === 'all') {
    return totalDueCards;
  }

  // Limited session options
  const limitedOption = await select({
    message: 'Choose session length:',
    options: [
      { value: 10, label: '◐ Quick session (10 cards)' },
      { value: 25, label: '◈ Standard session (25 cards)' },
      { value: 50, label: '◆ Intensive session (50 cards)' },
      { value: 'custom', label: '◉ Custom number' },
      { value: 'back', label: '◀ Back to study options' }
    ]
  });

  if (isCancel(limitedOption)) {
    return null;
  }

  if (limitedOption === 'back') {
    // Recursively call to go back to study options
    return setupStudySession(totalDueCards);
  }

  if (limitedOption === 'custom') {
    while (true) {
      const customNumber = await text({
        message: 'Enter number of cards:',
        placeholder: '1-100',
        validate: value => {
          const num = parseInt(value);
          if (isNaN(num) || num < 1 || num > 100) {
            return 'Please enter a number between 1 and 100';
          }
          return undefined;
        }
      });

      if (isCancel(customNumber)) {
        return setupStudySession(totalDueCards); // Go back to session length options
      }

      return parseInt(customNumber as string);
    }
  }

  return limitedOption as number;
}

export async function handleStudyMode(): Promise<void> {
  const dueCards = getDueCards();

  if (dueCards.length === 0) {
    showSuccess('No cards due for review! Great job!');
    return;
  }

  // Session setup
  const sessionLength = await setupStudySession(dueCards.length);
  if (sessionLength === null) return; // User cancelled

  // Select cards for this session
  const shuffled = [...dueCards].sort(() => Math.random() - 0.5);
  const sessionCards = shuffled.slice(0, sessionLength);

  await runStudySession(sessionCards, dueCards.length, 'due');
}
