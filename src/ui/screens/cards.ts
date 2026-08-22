import { chalk, heading, icons, muted, rule, truncate } from '../theme.js';
import { CANCELLED, pressBack, select, text, wasCancelled } from '../prompts.js';
import { isDue } from '../../core/sm2.js';
import { MS_PER_DAY } from '../../core/dates.js';
import type { Flashcard } from '../../types/index.js';

export interface NewCardInput {
  front: string;
  back: string;
  tags: string[];
}

function scheduleLabel(card: Flashcard, now = new Date()): string {
  if (isDue(card, now)) {
    return chalk.red(`${icons.due} Due`);
  }
  // Count from nextReview rather than `interval`: the interval is the gap set
  // at review time, so a card reviewed days ago would report the full gap
  // instead of the days actually left.
  const days = Math.max(1, Math.ceil((card.nextReview.getTime() - now.getTime()) / MS_PER_DAY));
  return chalk.green(`${icons.scheduled} In ${days} ${days === 1 ? 'day' : 'days'}`);
}

export async function addCardForm(): Promise<NewCardInput | null> {
  console.log(heading(`\n${icons.add} Add New Flashcard`));
  console.log(rule(30));

  const front = await text('Front (Question):', { placeholder: 'Enter the question...' });
  if (wasCancelled(front) || !front.trim()) {
    return null;
  }

  const back = await text('Back (Answer):', { placeholder: 'Enter the answer...' });
  if (wasCancelled(back) || !back.trim()) {
    return null;
  }

  const tagsInput = await text('Tags (comma-separated, optional):', {
    placeholder: 'e.g., programming, javascript, basics'
  });
  if (wasCancelled(tagsInput)) {
    return null;
  }

  return {
    front: front.trim(),
    back: back.trim(),
    tags: tagsInput.split(',')
  };
}

export function listCards(cards: readonly Flashcard[]): void {
  if (cards.length === 0) {
    console.log(chalk.yellow(`${icons.achievements} No flashcards found!`));
    return;
  }

  const now = new Date();
  console.log(heading(`\n${icons.cards} All Flashcards (${cards.length} total)`));
  console.log(rule(80));

  cards.forEach((card, index) => {
    const tags =
      card.tags.length > 0
        ? chalk.cyan(`${icons.tag} ${card.tags.join(', ')}`)
        : muted(`${icons.tag} No tags`);

    console.log(
      `${index + 1}. [${scheduleLabel(card, now)}] ` +
        `${chalk.white(truncate(card.front, 30))} → ${muted(truncate(card.back, 30))}`
    );
    console.log(`     ${tags}`);
  });

  console.log('');
}

function renderBrowsedCard(
  card: Flashcard,
  index: number,
  total: number,
  withAnswer: boolean
): void {
  console.clear();
  console.log(heading(`\n${icons.card} Card Browser - ${index + 1}/${total}`));
  console.log(rule(60));

  console.log(chalk.cyan('\n? Front:'));
  console.log(chalk.white(`  ${card.front}`));

  if (withAnswer) {
    console.log(chalk.green(`\n${icons.success} Answer:`));
    console.log(chalk.white(`  ${card.back}`));
  }

  if (card.tags.length > 0) {
    console.log(chalk.cyan(`\n${icons.tag} ${card.tags.join(', ')}`));
  }

  console.log(
    muted(
      `\nStatus: ${scheduleLabel(card)} | Reviews: ${card.repetitions} | ` +
        `Easiness: ${card.easiness.toFixed(2)}`
    )
  );
}

export async function browseCards(cards: readonly Flashcard[]): Promise<void> {
  if (cards.length === 0) {
    console.log(chalk.yellow(`${icons.achievements} No flashcards found!`));
    return;
  }

  let index = 0;
  let showAnswer = false;

  while (index >= 0 && index < cards.length) {
    renderBrowsedCard(cards[index], index, cards.length, showAnswer);

    const options = [
      ...(showAnswer ? [] : [{ value: 'answer' as const, label: `${icons.card} Show Answer` }]),
      { value: 'next' as const, label: `${icons.next} Next Card` },
      { value: 'previous' as const, label: `${icons.back} Previous Card` },
      { value: 'back' as const, label: `${icons.back} Back to Main Menu` }
    ];

    const action = await select(
      showAnswer ? '\nContinue?' : '\nWhat would you like to do?',
      options
    );

    if (action === CANCELLED || action === 'back') {
      return;
    }
    if (action === 'answer') {
      showAnswer = true;
      continue;
    }

    showAnswer = false;
    index = action === 'next' ? index + 1 : Math.max(0, index - 1);
  }
}

export async function chooseListView(cardCount: number): Promise<'quick' | 'browse' | null> {
  console.log(`\n${icons.cards} ${cardCount} cards available\n`);

  const option = await select('How would you like to view your cards?', [
    { value: 'quick' as const, label: `${icons.list} Quick List View` },
    { value: 'browse' as const, label: `${icons.card} Browse Cards One by One` },
    { value: 'back' as const, label: `${icons.back} Back to Main Menu` }
  ]);

  // A cancellation is an explicit "get me out", not a request for the list.
  if (option === CANCELLED || option === 'back') {
    return null;
  }
  return option;
}

export async function showSearchResults(cards: readonly Flashcard[], query: string): Promise<void> {
  if (cards.length === 0) {
    console.log(chalk.yellow(`${icons.achievements} No cards found for "${query}"`));
    return;
  }

  console.log(heading(`\n${icons.cards} Found ${cards.length} matching cards:`));
  console.log(rule(60));

  const now = new Date();
  cards.forEach((card, index) => {
    console.log(`${index + 1}. ${chalk.white(card.front)} → ${muted(card.back)}`);
    console.log(`   Status: ${scheduleLabel(card, now)}`);
  });

  await pressBack();
}

export async function chooseCardToDelete(cards: readonly Flashcard[]): Promise<string | null> {
  if (cards.length === 0) {
    console.log(chalk.yellow(`${icons.achievements} No flashcards to delete!`));
    return null;
  }

  const options = [
    { value: null, label: `${icons.remove} Cancel` },
    ...cards.map((card, index) => ({
      value: card.id,
      label: `${index + 1}. ${truncate(card.front, 40)} → ${truncate(card.back, 40)}`
    }))
  ];

  const selected = await select<string | null>('Select a card to delete:', options);
  return selected === CANCELLED ? null : selected;
}
