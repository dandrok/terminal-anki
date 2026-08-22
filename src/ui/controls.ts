/** One key binding, rendered in both the footer strip and the help overlay. */
export interface Control {
  key: string;
  /** Terse footer text. */
  label: string;
  /** Long-form explanation shown in the help overlay. */
  description: string;
}

/**
 * The keys every screen answers to, in a fixed order.
 *
 * Appended by `screenControls` rather than written out per screen, so the tail
 * of the footer strip is identical everywhere and cannot drift.
 *
 * There is exactly one rule: `q` and `esc` leave whatever you are currently in.
 * On a sub-screen that means going back a step; on the menu, which is the
 * outermost thing, it means quitting. Making `q` quit the application outright
 * was worse — pressing the obvious "I am done" key mid-session closed the whole
 * app instead of showing the session summary.
 *
 * Ctrl+C still quits from anywhere, and flushes on the way out.
 */
export const BACK_CONTROL: Control = {
  key: 'q/esc',
  label: 'back',
  description: 'Leave this screen and go back a step'
};

export const HELP_CONTROL: Control = {
  key: '?',
  label: 'help',
  description: 'Show what each key on this screen does'
};

/** The menu is the outermost screen, so leaving it quits. */
export const ROOT_QUIT_CONTROL: Control = {
  key: 'q/esc',
  label: 'quit',
  description: 'Quit Terminal Anki'
};

export const MOVE_CONTROL: Control = {
  key: '↑↓/jk',
  label: 'move',
  description: 'Move the selection'
};

export const SELECT_CONTROL: Control = {
  key: '⏎',
  label: 'select',
  description: 'Open the highlighted entry'
};

export interface ScreenControlOptions {
  /** Root screens have nowhere to go back to. */
  isRoot?: boolean;
}

/**
 * Screen-specific keys followed by the standard tail.
 *
 * Every footer therefore ends `… [q/esc] back [?] help`, so moving between
 * screens never changes where the navigation keys are or what they do.
 */
export function screenControls(
  specific: readonly Control[] = [],
  options: ScreenControlOptions = {}
): Control[] {
  return [...specific, options.isRoot ? ROOT_QUIT_CONTROL : BACK_CONTROL, HELP_CONTROL];
}

/** Every key a screen binds, for conflict checking. */
export function keysOf(controls: readonly Control[]): string[] {
  return controls.map(control => control.key);
}

export const MENU_CONTROLS: Control[] = screenControls([MOVE_CONTROL, SELECT_CONTROL], {
  isRoot: true
});

export const READONLY_CONTROLS: Control[] = screenControls();
