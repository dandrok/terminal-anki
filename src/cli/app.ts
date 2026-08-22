import { shuffle } from '../core/filters.js';
import { createStore, type Store, type StoreOptions } from '../state/store.js';
import {
  selectAllTags,
  selectCards,
  selectDueCards,
  selectExtendedStats,
  selectFilteredCards,
  selectSearchResults
} from '../state/selectors.js';
import { showError, showSuccess } from '../ui/messages.js';
import * as menu from '../ui/screens/menu.js';
import * as cardScreens from '../ui/screens/cards.js';
import * as studyScreens from '../ui/screens/study.js';
import * as progressScreens from '../ui/screens/progress.js';
import { pressBack, text, wasCancelled } from '../ui/prompts.js';
import type { CustomStudyFilters, Flashcard, SessionType } from '../types/index.js';

/** Read the current snapshot. Kept terse because it is used everywhere. */
const snap = (store: Store) => store.getSnapshot();

async function studyMode(store: Store): Promise<void> {
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

async function customStudyMode(store: Store): Promise<void> {
  const filters = await studyScreens.customStudySetup(selectAllTags(snap(store)));
  if (!filters) {
    return;
  }

  // Every criterion is applied in one pass, so `dueOnly` actually takes effect.
  const selected = selectFilteredCards(snap(store), filters);
  if (selected.length === 0) {
    showError('No cards match your filters!');
    return;
  }

  await runSession(store, selected, 'custom', filters);
}

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
  if (filters) {
    const description = studyScreens.describeFilters(filters);
    if (description) {
      console.log(description);
    }
  }

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
    // Invert the grade so 0 is easiest and 5 is hardest.
    difficulties.push(5 - grade);
    if (grade >= 3) {
      correctAnswers++;
    }
  }

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

  studyScreens.showSessionSummary({
    studied,
    skipped: sessionCards.length - studied,
    // Recounted from the collection rather than subtracted from the starting
    // total, so cards graded "Again" (due back in 10 minutes) are included.
    remainingDue: selectDueCards(snap(store)).length,
    quitEarly
  });
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

async function listCards(store: Store): Promise<void> {
  const all = [...selectCards(snap(store))];
  if (all.length === 0) {
    showSuccess('No flashcards found!');
    return;
  }

  const view = await cardScreens.chooseListView(all.length);
  if (view === 'quick') {
    cardScreens.listCards(all);
    await pressBack();
  } else if (view === 'browse') {
    await cardScreens.browseCards(all);
  }
}

async function searchCards(store: Store): Promise<void> {
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

async function dispatchAction(
  store: Store,
  action: Exclude<menu.MenuAction, 'exit'>
): Promise<void> {
  switch (action) {
    case 'study':
      return studyMode(store);
    case 'custom_study':
      return customStudyMode(store);
    case 'add':
      return addCard(store);
    case 'list':
      return listCards(store);
    case 'search':
      return searchCards(store);
    case 'delete':
      return deleteCard(store);
    case 'achievements':
      return progressScreens.showAchievements(selectExtendedStats(snap(store)).achievements);
    case 'analytics':
      return progressScreens.showAnalytics(selectExtendedStats(snap(store)));
    case 'stats':
      return progressScreens.showQuickStats(selectExtendedStats(snap(store)));
  }
}

/** Run the interactive menu loop until the user exits. */
export async function runInteractive(store: Store): Promise<void> {
  menu.showIntro();

  for (;;) {
    const action = await menu.showMainMenu(selectExtendedStats(snap(store)));

    if (action === 'exit') {
      menu.showOutro();
      return;
    }

    try {
      await dispatchAction(store, action);
    } catch (error) {
      showError(`An error occurred: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

/** Run a single study session and return, used by `anki --study`. */
export async function runStudyOnly(store: Store): Promise<void> {
  await studyMode(store);
}

export function createAppStore(options: StoreOptions = {}): Store {
  return createStore(options);
}
