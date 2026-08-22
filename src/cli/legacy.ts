import { shuffle } from '../core/filters.js';
import {
  selectAllTags,
  selectCards,
  selectDueCards,
  selectFilteredCards,
  selectSearchResults
} from '../state/selectors.js';
import { showError, showSuccess } from '../ui/messages.js';
import * as cardScreens from '../ui/screens/cards.js';
import * as studyScreens from '../ui/screens/study.js';
import { text, wasCancelled } from '../ui/prompts.js';
import type { Store } from '../state/store.js';
import type { CustomStudyFilters, Flashcard, SessionType } from '../types/index.js';
import type { Screen } from '../ui/screens/Screen.js';

/**
 * Screens still driven by @clack/prompts.
 *
 * Temporary: each function here is replaced by an Ink screen in a later phase,
 * and this file disappears with the last one. It exists so the application
 * stays fully usable while the interface is ported one screen at a time.
 */

const snap = (store: Store) => store.getSnapshot();

async function runSession(
  store: Store,
  sessionCards: readonly Flashcard[],
  sessionType: SessionType,
  filters?: CustomStudyFilters
): Promise<void> {
  const startTime = new Date();
  const difficulties: number[] = [];
  let correctAnswers = 0;
  let studied = 0;
  let quitEarly = false;

  studyScreens.showSessionStart(
    sessionCards.length,
    sessionType === 'custom' ? 'custom' : sessionType
  );

  for (const [index, card] of sessionCards.entries()) {
    studyScreens.showQuestion(card, index, sessionCards.length);

    const action = await studyScreens.askCardAction();
    if (action === 'quit') {
      quitEarly = true;
      break;
    }
    if (action === 'skip') {
      continue;
    }

    studyScreens.showAnswer(card);

    const grade = await studyScreens.askGrade();
    if (grade === 'quit') {
      quitEarly = true;
      break;
    }

    store.dispatch({ type: 'card/grade', id: card.id, quality: grade, now: new Date() });
    studied++;
    difficulties.push(5 - grade);
    if (grade >= 3) {
      correctAnswers++;
    }
  }

  // Recording a session marks today as a study day; quitting before grading
  // anything is not studying.
  if (studied > 0) {
    store.dispatch({
      type: 'session/record',
      now: new Date(),
      session: {
        startTime,
        endTime: new Date(),
        cardsStudied: studied,
        correctAnswers,
        incorrectAnswers: studied - correctAnswers,
        averageDifficulty:
          difficulties.length > 0
            ? difficulties.reduce((sum, value) => sum + value, 0) / difficulties.length
            : 0,
        sessionType,
        customFilters: filters ? { tags: filters.tags, difficulty: filters.difficulty } : undefined,
        quitEarly
      }
    });
  }

  studyScreens.showSessionSummary({
    studied,
    skipped: sessionCards.length - studied,
    remainingDue: selectDueCards(snap(store)).length,
    quitEarly
  });
}

async function study(store: Store): Promise<void> {
  const due = selectDueCards(snap(store));
  if (due.length === 0) {
    showSuccess('No cards due for review! Great job!');
    return;
  }

  const length = await studyScreens.chooseSessionLength(due.length);
  if (length === null) {
    return;
  }
  await runSession(store, shuffle(due).slice(0, length), 'due');
}

async function customStudy(store: Store): Promise<void> {
  const filters = await studyScreens.customStudySetup(selectAllTags(snap(store)));
  if (!filters) {
    return;
  }

  const selected = selectFilteredCards(snap(store), filters);
  if (selected.length === 0) {
    showError('No cards match your filters!');
    return;
  }
  await runSession(store, selected, 'custom', filters);
}

async function addCard(store: Store): Promise<void> {
  const input = await cardScreens.addCardForm();
  if (!input) {
    return;
  }
  store.dispatch({
    type: 'card/add',
    front: input.front,
    back: input.back,
    tags: input.tags,
    now: new Date()
  });
  showSuccess('Flashcard added successfully!');
}

async function browse(store: Store): Promise<void> {
  const all = [...selectCards(snap(store))];
  if (all.length === 0) {
    showSuccess('No flashcards found!');
    return;
  }
  await cardScreens.browseCards(all);
}

async function search(store: Store): Promise<void> {
  const query = await text('◉ Search for:', { placeholder: 'Enter search terms...' });
  if (wasCancelled(query) || !query.trim()) {
    return;
  }
  await cardScreens.showSearchResults(selectSearchResults(snap(store), query), query.trim());
}

async function deleteCard(store: Store): Promise<void> {
  const id = await cardScreens.chooseCardToDelete([...selectCards(snap(store))]);
  if (!id) {
    return;
  }

  const before = snap(store);
  store.dispatch({ type: 'card/delete', id });
  if (snap(store) !== before) {
    showSuccess('Card deleted successfully!');
  } else {
    showError('Failed to delete card!');
  }
}

export async function runLegacyScreen(store: Store, screen: Screen): Promise<void> {
  switch (screen) {
    case 'study':
      return study(store);
    case 'custom-study':
      return customStudy(store);
    case 'add':
      return addCard(store);
    case 'browse':
      return browse(store);
    case 'search':
      return search(store);
    case 'delete':
      return deleteCard(store);
    default:
      return;
  }
}

export { study as runStudySession };
