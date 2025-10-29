import chalk from 'chalk';
import ora from 'ora';
import { intro, outro, confirm } from '@clack/prompts';

export const showIntro = (): void => {
  intro(chalk.cyan('※ Terminal Anki - Flashcard Learning System'));
};

export const showOutro = (): void => {
  outro(chalk.green('Happy learning! Goodbye! ○'));
};

export const showSuccess = (message: string): void => {
  console.log(chalk.green(`✓ ${message}`));
};

export const showError = (message: string): void => {
  console.log(chalk.red(`× ${message}`));
};

export const showSpinner = (message: string): any => {
  return ora(message).start();
};

export const pause = async (): Promise<void> => {
  await confirm({
    message: 'Press Enter to continue...'
  });
};
