import { chalk, heading, icons, muted, rule } from '../theme.js';
import {
  CANCELLED,
  confirm,
  integerInRange,
  multiselect,
  select,
  text,
  wasCancelled
} from '../prompts.js';
import type {
  CustomStudyFilters,
  DifficultyLevel,
  Flashcard,
  ReviewQuality
} from '../../types/index.js';

/** What the learner chose to do when shown a card's question. */
export type CardAction = 'show' | 'skip' | 'quit';
/** A grade, or a request to end the session. */
export type Grade = ReviewQuality | 'quit';

const SESSION_SIZES = [
  { value: 10, label: `${icons.exit} Quick session (10 cards)` },
  { value: 25, label: `${icons.stats} Standard session (25 cards)` },
  { value: 50, label: `${icons.study} Intensive session (50 cards)` }
];

/** Ask how many of the due cards to study. `null` means the user backed out. */
export async function chooseSessionLength(totalDueCards: number): Promise<number | null> {
  console.log(`\n${icons.card} ${totalDueCards} cards due today\n`);

  for (;;) {
    const sessionType = await select('Study options:', [
      { value: 'all' as const, label: `${icons.study} Study all due cards (${totalDueCards})` },
      { value: 'limited' as const, label: `${icons.stats} Study limited session` },
      { value: 'cancel' as const, label: `${icons.exit} Cancel` }
    ]);

    if (sessionType === CANCELLED || sessionType === 'cancel') {
      return null;
    }
    if (sessionType === 'all') {
      return totalDueCards;
    }

    const choice = await select<number | 'custom' | 'back'>('Choose session length:', [
      ...SESSION_SIZES,
      { value: 'custom', label: `${icons.card} Custom number` },
      { value: 'back', label: `${icons.back} Back to study options` }
    ]);

    if (choice === CANCELLED) {
      return null;
    }
    // Loop instead of recursing, so backing out repeatedly cannot grow the stack.
    if (choice === 'back') {
      continue;
    }
    if (choice !== 'custom') {
      return choice;
    }

    const custom = await promptCardCount();
    if (custom !== null) {
      return custom;
    }
  }
}

async function promptCardCount(): Promise<number | null> {
  const value = await text('Enter number of cards:', {
    placeholder: '1-100',
    validate: integerInRange(1, 100)
  });

  return wasCancelled(value) ? null : Number(value.trim());
}

export function showSessionStart(cardCount: number, sessionType: string): void {
  console.log(`\n${icons.exit} Starting ${sessionType} study session with ${cardCount} cards...`);
  console.log(rule(50));
}

export function showQuestion(card: Flashcard, index: number, total: number): void {
  console.log(`\n○ Card ${index + 1}/${total}`);
  console.log(`Question: ${card.front}`);
}

export function showAnswer(card: Flashcard): void {
  console.log(`\nAnswer: ${card.back}`);
}

export async function askCardAction(): Promise<CardAction> {
  console.log('\nChoose your action:');

  const action = await select<CardAction>('', [
    { value: 'show', label: `${icons.card} Show Answer` },
    { value: 'skip', label: `${icons.exit} Skip Card` },
    { value: 'quit', label: `${icons.remove} Quit Session` }
  ]);

  return action === CANCELLED ? 'quit' : action;
}

export async function askGrade(): Promise<Grade> {
  const grade = await select<Grade>('How well did you know this?', [
    { value: 0, label: `${icons.remove} Again (0) - Show card soon` },
    { value: 1, label: '◐ Hard (1)' },
    { value: 3, label: '◑ Good (3)' },
    { value: 4, label: '◒ Easy (4)' },
    { value: 5, label: '◓ Perfect (5)' },
    { value: 'quit', label: `${icons.remove} Quit Session` }
  ]);

  return grade === CANCELLED ? 'quit' : grade;
}

export interface SessionSummary {
  studied: number;
  skipped: number;
  remainingDue: number;
  quitEarly: boolean;
}

export function showSessionSummary(summary: SessionSummary): void {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`${icons.custom} Session Summary`);
  console.log('='.repeat(50));
  console.log(`${icons.success} Studied: ${summary.studied} cards`);
  if (summary.skipped > 0) {
    console.log(`${icons.analytics} Not studied: ${summary.skipped} cards`);
  }
  console.log(`${icons.card} Remaining due today: ${summary.remainingDue} cards`);
  console.log(`${icons.stats} Progress saved automatically`);
  console.log(
    summary.quitEarly
      ? '\n○ See you next time!'
      : `\n${icons.star} Great job! Keep up the good work!`
  );
  console.log('='.repeat(50));
}

const DIFFICULTY_CHOICES: { value: DifficultyLevel | null; label: string }[] = [
  { value: null, label: `${icons.analytics} All difficulties` },
  { value: 'new', label: `${icons.analytics} New cards (≤1 day)` },
  { value: 'learning', label: '◐ Learning (2-7 days)' },
  { value: 'young', label: `${icons.card} Young (8-30 days)` },
  { value: 'mature', label: '◊ Mature (>30 days)' }
];

/**
 * Build the filter set for a custom session.
 *
 * The chosen study type is folded into the returned filters (`dueOnly`,
 * `tags`, `difficulty`) rather than being dropped, which is what made the
 * "study due cards" option behave identically to "study all cards".
 */
export async function customStudySetup(
  allTags: readonly string[]
): Promise<CustomStudyFilters | null> {
  console.log(heading(`\n${icons.custom} Custom Study Session Setup`));
  console.log(rule(50));

  const studyType = await select('Choose study type:', [
    { value: 'due' as const, label: `${icons.due} Study due cards (with filters)` },
    { value: 'all' as const, label: `${icons.card} Study all cards (with filters)` },
    { value: 'tags' as const, label: `${icons.tag} Study by tags` },
    { value: 'difficulty' as const, label: `${icons.easiness} Study by difficulty level` },
    { value: 'cancel' as const, label: `${icons.remove} Cancel` }
  ]);

  if (studyType === CANCELLED || studyType === 'cancel') {
    return null;
  }

  const filters: CustomStudyFilters = { dueOnly: studyType === 'due' };

  if (allTags.length === 0) {
    if (studyType === 'tags') {
      console.log(chalk.yellow(`${icons.achievements} No cards have tags yet — add some first.`));
      return null;
    }
  } else {
    const selectedTags = await multiselect(
      studyType === 'tags' ? 'Select tags:' : 'Filter by tags (optional):',
      allTags.map(tag => ({ value: tag, label: `${icons.tag} ${tag}` })),
      { required: studyType === 'tags' }
    );

    if (selectedTags === CANCELLED) {
      return null;
    }
    if (selectedTags.length > 0) {
      filters.tags = selectedTags;
    }
  }

  if (studyType !== 'tags') {
    const difficulty = await select('Select difficulty (optional):', DIFFICULTY_CHOICES);
    if (difficulty === CANCELLED) {
      return null;
    }
    if (difficulty) {
      filters.difficulty = difficulty;
    }
  }

  const limit = await select<number | 'custom' | null>('Number of cards:', [
    { value: null, label: `${icons.analytics} All matching cards` },
    ...SESSION_SIZES,
    { value: 'custom', label: `${icons.card} Custom number` }
  ]);

  if (limit === CANCELLED) {
    return null;
  }
  if (limit === 'custom') {
    const custom = await promptCardCount();
    if (custom === null) {
      return null;
    }
    filters.limit = custom;
  } else if (limit !== null) {
    filters.limit = limit;
  }

  const randomOrder = await confirm('Randomize card order?', true);
  if (randomOrder === CANCELLED) {
    return null;
  }
  filters.randomOrder = randomOrder;

  return filters;
}

export function describeFilters(filters: CustomStudyFilters): string {
  const parts: string[] = [];
  if (filters.dueOnly) {
    parts.push('due only');
  }
  if (filters.tags?.length) {
    parts.push(`tags: ${filters.tags.join(', ')}`);
  }
  if (filters.difficulty) {
    parts.push(`difficulty: ${filters.difficulty}`);
  }
  return parts.length > 0 ? muted(`  (${parts.join(' | ')})`) : '';
}
