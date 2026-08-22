import { chalk, icons } from './theme.js';

export function showSuccess(message: string): void {
  console.log(chalk.green(`${icons.success} ${message}`));
}

export function showError(message: string): void {
  console.log(chalk.red(`${icons.remove} ${message}`));
}

export function showWarning(message: string): void {
  console.log(chalk.yellow(`! ${message}`));
}

export function showInfo(message: string): void {
  console.log(chalk.cyan(message));
}
