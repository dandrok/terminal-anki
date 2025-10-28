import chalk from 'chalk';
import { text, isCancel } from '@clack/prompts';

export async function addCardForm(): Promise<{
  front: string;
  back: string;
  tags: string[];
} | null> {
  console.log(chalk.blue('\n+ Add New Flashcard'));
  console.log(chalk.gray('-'.repeat(30)));

  const front = await text({
    message: 'Front (Question):',
    placeholder: 'Enter the question...'
  });

  if (isCancel(front) || !front) {
    return null;
  }

  const back = await text({
    message: 'Back (Answer):',
    placeholder: 'Enter the answer...'
  });

  if (isCancel(back) || !back) {
    return null;
  }

  const tagsInput = await text({
    message: 'Tags (comma-separated, optional):',
    placeholder: 'e.g., programming, javascript, basics'
  });

  if (isCancel(tagsInput)) {
    return null;
  }

  // Parse tags from comma-separated input
  const tags = ((tagsInput as string) || '')
    .split(',')
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0);

  return { front: front as string, back: back as string, tags };
}
