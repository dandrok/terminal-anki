import chalk from 'chalk';
import { select, multiselect, text, isCancel } from '@clack/prompts';

export async function editCardTags(
  currentTags: string[],
  allTags: string[]
): Promise<string[] | null> {
  console.log(chalk.blue('\n◈ Edit Card Tags'));
  console.log(chalk.gray('-'.repeat(30)));
  console.log(`Current tags: ${currentTags.length > 0 ? currentTags.join(', ') : 'No tags'}`);

  const option = await select({
    message: 'What would you like to do?',
    options: [
      { value: 'select', label: '◈ Choose from existing tags' },
      { value: 'add', label: '+ Add new tags' },
      { value: 'remove', label: '- Remove all tags' },
      { value: 'keep', label: '✓ Keep current tags' },
      { value: 'cancel', label: '× Cancel' }
    ]
  });

  if (isCancel(option) || option === 'cancel' || option === 'keep') {
    return null;
  }

  if (option === 'remove') {
    return [];
  }

  if (option === 'select') {
    const selectedTags = await multiselect({
      message: 'Select tags:',
      options: allTags.map(tag => ({
        value: tag,
        label: tag
      })),
      initialValues: currentTags
    });

    if (isCancel(selectedTags)) {
      return null;
    }

    return selectedTags as string[];
  }

  if (option === 'add') {
    const newTags = await text({
      message: 'Enter new tags (comma-separated):',
      placeholder: 'tag1, tag2, tag3'
    });

    if (isCancel(newTags) || !newTags) {
      return null;
    }

    const parsedTags = (newTags as string)
      .split(',')
      .map(tag => tag.trim().toLowerCase())
      .filter(tag => tag.length > 0);

    return [...new Set([...currentTags, ...parsedTags])];
  }

  return null;
}
