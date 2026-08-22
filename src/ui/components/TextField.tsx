import { Text } from 'ink';
import { useTheme } from '../hooks/useTheme.js';

export interface TextFieldProps {
  value: string;
  placeholder?: string;
  /** Draw the caret and highlight, i.e. this field has focus. */
  isActive?: boolean;
  width?: number;
}

const BACKSPACE = String.fromCharCode(8);
const DELETE = String.fromCharCode(127);

/** Printable ASCII, the range a terminal delivers as plain input. */
export function isPrintable(stroke: string): boolean {
  return stroke.length === 1 && stroke >= ' ' && stroke <= '~';
}

/**
 * Apply one keystroke to a text value.
 *
 * Pure, so the editing rules are testable without rendering anything. Returns
 * the value unchanged for keys it does not handle, letting the caller tell
 * whether the stroke was consumed.
 */
export function applyStroke(value: string, stroke: string, maxLength: number): string {
  if (stroke === BACKSPACE || stroke === DELETE) {
    return value.slice(0, -1);
  }
  if (isPrintable(stroke)) {
    return (value + stroke).slice(0, maxLength);
  }
  return value;
}

export const DEFAULT_MAX_LENGTH = 200;

/**
 * Apply a keystroke, given Ink's key flags.
 *
 * Ink reports backspace and delete as flags with an empty `input`, so a screen
 * cannot just forward the character.
 */
export function applyKey(
  value: string,
  stroke: string,
  key: { backspace?: boolean; delete?: boolean; ctrl?: boolean; meta?: boolean },
  maxLength: number = DEFAULT_MAX_LENGTH
): string {
  if (key.backspace || key.delete) {
    return value.slice(0, -1);
  }
  // Ink reports Ctrl+D as input "d" with ctrl set, and the letter is printable,
  // so without this a chord types its letter into the field. Ctrl+W, Ctrl+U and
  // Ctrl+A are common editing habits and would all do it.
  if (key.ctrl || key.meta) {
    return value;
  }
  return applyStroke(value, stroke, maxLength);
}

/**
 * A single-line text input.
 *
 * Hand-rolled rather than adding `ink-text-input`: the editing rules are ten
 * lines, and keeping them here means they can be unit-tested as a pure function
 * instead of through a third-party component.
 */
export function TextField({ value, placeholder, isActive = false, width = 40 }: TextFieldProps) {
  const theme = useTheme();
  const showPlaceholder = value.length === 0 && placeholder !== undefined;

  // The focused field scrolls to its tail so the caret stays visible; an
  // unfocused one keeps its head, because showing the end of a value with no
  // caret just looks like the text was chopped off at the front.
  const visible =
    value.length <= width
      ? value
      : isActive
        ? value.slice(value.length - width)
        : `${value.slice(0, Math.max(0, width - 1))}…`;

  if (showPlaceholder) {
    return (
      <Text color={theme.muted} italic={!isActive}>
        {isActive ? '▏' : ''}
        {placeholder}
      </Text>
    );
  }

  return (
    <Text color={isActive ? theme.text : theme.muted}>
      {visible}
      {isActive ? <Text color={theme.primary}>▏</Text> : null}
    </Text>
  );
}
