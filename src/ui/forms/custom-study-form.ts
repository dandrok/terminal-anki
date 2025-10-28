import chalk from 'chalk';
import { select, multiselect, text, confirm, isCancel } from '@clack/prompts';
import { CustomStudyFilters } from '../../features/flashcards/domain';

export async function customStudySessionSetup(
  allTags: string[]
): Promise<CustomStudyFilters | null> {
  console.log(chalk.blue('\n◎ Custom Study Session Setup'));
  console.log(chalk.gray('-'.repeat(50)));

  const sessionType = await select({
    message: 'Choose study type:',
    options: [
      { value: 'due', label: '◳ Study due cards (with filters)' },
      { value: 'all', label: '◉ Study all cards (with filters)' },
      { value: 'tags', label: '◈ Study by tags' },
      { value: 'difficulty', label: '◵ Study by difficulty level' },
      { value: 'cancel', label: '× Cancel' }
    ]
  });

  if (isCancel(sessionType) || sessionType === 'cancel') {
    return null;
  }

  const filters: CustomStudyFilters = {};

  // Tag selection - only show for "Study by tags" option
  if (sessionType === 'tags') {
    const selectedTags = await multiselect({
      message: 'Select tags:',
      options: allTags.map(tag => ({ value: tag, label: `◈ ${tag}` })),
      required: true
    });

    if (!isCancel(selectedTags) && selectedTags && selectedTags.length > 0) {
      filters.tags = selectedTags as string[];
    }
  } else {
    // For "due" and "all" session types, allow optional tag filtering
    const optionalTags = await multiselect({
      message: 'Filter by tags (optional):',
      options: allTags.map(tag => ({ value: tag, label: `◈ ${tag}` })),
      required: false
    });

    if (!isCancel(optionalTags) && optionalTags && optionalTags.length > 0) {
      filters.tags = optionalTags as string[];
    }
  }

  // Difficulty selection
  if (sessionType === 'difficulty' || (sessionType as string) !== 'tags') {
    const difficulty = await select({
      message: 'Select difficulty (optional):',
      options: [
        { value: undefined, label: '◰ All difficulties' },
        { value: 'new', label: '◰ New cards (≤1 day)' },
        { value: 'learning', label: '◐ Learning (2-7 days)' },
        { value: 'young', label: '◉ Young (8-30 days)' },
        { value: 'mature', label: '◊ Mature (>30 days)' }
      ]
    });

    if (!isCancel(difficulty) && difficulty) {
      filters.difficulty = difficulty as 'new' | 'learning' | 'young' | 'mature';
    }
  }

  // Session limit
  const limitChoice = await select({
    message: 'Number of cards:',
    options: [
      { value: undefined, label: '◰ All matching cards' },
      { value: 10, label: '◐ Quick (10 cards)' },
      { value: 25, label: '◈ Standard (25 cards)' },
      { value: 50, label: '◆ Intensive (50 cards)' },
      { value: 'custom', label: '◉ Custom number' }
    ]
  });

  if (isCancel(limitChoice)) {
    return null;
  }

  if (limitChoice === 'custom') {
    const customLimit = await text({
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

    if (!isCancel(customLimit) && customLimit) {
      filters.limit = parseInt(customLimit as string);
    }
  } else if (limitChoice !== undefined) {
    filters.limit = limitChoice as number;
  }

  // Random order
  const randomOrder = await confirm({
    message: 'Randomize card order?',
    initialValue: true
  });

  if (!isCancel(randomOrder)) {
    filters.randomOrder = randomOrder as boolean;
  }

  return filters;
}
