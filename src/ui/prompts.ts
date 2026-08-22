import {
  confirm as clackConfirm,
  intro as clackIntro,
  isCancel,
  multiselect as clackMultiselect,
  outro as clackOutro,
  select as clackSelect,
  text as clackText,
  type Option
} from '@clack/prompts';
import { icons } from './theme.js';

/** Returned instead of a value when the user aborts a prompt. */
export const CANCELLED = Symbol('cancelled');
export type Cancelled = typeof CANCELLED;

export function wasCancelled<T>(value: T | Cancelled): value is Cancelled {
  return value === CANCELLED;
}

export interface Choice<T> {
  value: T;
  label: string;
  hint?: string;
}

/**
 * clack's `Option<Value>` is a conditional type that only makes `label`
 * optional for primitive values. TypeScript cannot resolve that conditional
 * while `T` is still generic, even though `Choice<T>` always supplies a
 * `label` and so satisfies both branches.
 */
function asOptions<T>(choices: Choice<T>[]): Option<T>[] {
  return choices as Option<T>[];
}

export const intro = clackIntro;
export const outro = clackOutro;

/**
 * Thin wrappers around @clack/prompts that funnel every abort into a single
 * `CANCELLED` sentinel, so callers cannot accidentally treat a cancellation as
 * a real answer -- which is how Ctrl+C used to be read as "show the card list".
 */
export async function select<T>(message: string, options: Choice<T>[]): Promise<T | Cancelled> {
  const result = await clackSelect<T>({ message, options: asOptions(options) });
  return isCancel(result) ? CANCELLED : result;
}

export async function multiselect<T>(
  message: string,
  options: Choice<T>[],
  config: { required?: boolean; initialValues?: T[] } = {}
): Promise<T[] | Cancelled> {
  // clack renders an unusable prompt with no options at all.
  if (options.length === 0) {
    return [];
  }

  const result = await clackMultiselect<T>({
    message,
    options: asOptions(options),
    required: config.required ?? false,
    ...(config.initialValues ? { initialValues: config.initialValues } : {})
  });

  return isCancel(result) ? CANCELLED : result;
}

export async function text(
  message: string,
  config: { placeholder?: string; validate?: (value: string) => string | undefined } = {}
): Promise<string | Cancelled> {
  const validate = config.validate;
  const result = await clackText({
    message,
    ...(config.placeholder ? { placeholder: config.placeholder } : {}),
    ...(validate ? { validate: (value: string | undefined) => validate(value ?? '') } : {})
  });

  return isCancel(result) ? CANCELLED : (result ?? '');
}

export async function confirm(message: string, initialValue = true): Promise<boolean | Cancelled> {
  const result = await clackConfirm({ message, initialValue });
  return isCancel(result) ? CANCELLED : result;
}

/** A single "back to main menu" acknowledgement, used to end read-only screens. */
export async function pressBack(): Promise<void> {
  await select('', [{ value: 'back', label: `${icons.back} Back to main menu` }]);
}

/** Reject anything that is not a whole number in `[min, max]`. */
export function integerInRange(min: number, max: number) {
  return (value: string): string | undefined => {
    const parsed = Number(value.trim());
    if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
      return `Please enter a whole number between ${min} and ${max}`;
    }
    return undefined;
  };
}
