/** One key binding, rendered in both the footer strip and the help overlay. */
export interface Control {
  key: string;
  /** Terse footer text. */
  label: string;
  /** Long-form explanation shown in the help overlay. */
  description: string;
}

/** Appended to every screen's controls so help documents itself. */
export const HELP_CONTROL: Control = {
  key: '?',
  label: 'help',
  description: 'Show what each key on this screen does'
};

export const BACK_CONTROL: Control = {
  key: 'esc',
  label: 'back',
  description: 'Return to the previous screen'
};

export const MENU_CONTROLS: Control[] = [
  { key: '↑↓/jk', label: 'move', description: 'Move between menu entries' },
  { key: '⏎', label: 'select', description: 'Open the highlighted entry' },
  { key: 'q', label: 'quit', description: 'Exit Terminal Anki' },
  HELP_CONTROL
];

export const READONLY_CONTROLS: Control[] = [BACK_CONTROL, HELP_CONTROL];

/** Every key a screen binds, for conflict checking. */
export function keysOf(controls: readonly Control[]): string[] {
  return controls.map(control => control.key);
}
