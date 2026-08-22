import { describe, expect, it } from 'vitest';
import {
  BACK_CONTROL,
  HELP_CONTROL,
  MENU_CONTROLS,
  READONLY_CONTROLS,
  keysOf,
  type Control
} from '../../src/ui/controls.js';

const SCREENS: [string, readonly Control[]][] = [
  ['menu', MENU_CONTROLS],
  ['read-only screens', READONLY_CONTROLS]
];

describe('screen controls', () => {
  // These invariants are otherwise only discoverable by hand-testing every
  // screen, which is exactly the kind of check that gets skipped.
  it.each(SCREENS)('%s binds no key twice', (_name, controls) => {
    const keys = keysOf(controls);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it.each(SCREENS)('%s offers a way out', (_name, controls) => {
    const keys = keysOf(controls);
    const hasEscape = keys.some(key => key === 'esc' || key === 'q');
    expect(hasEscape).toBe(true);
  });

  it.each(SCREENS)('%s documents its help key', (_name, controls) => {
    // HELP_CONTROL is appended everywhere so help documents itself.
    expect(controls).toContainEqual(HELP_CONTROL);
  });

  it.each(SCREENS)('%s gives every control a label and a description', (_name, controls) => {
    for (const control of controls) {
      expect(control.key.length).toBeGreaterThan(0);
      expect(control.label.length).toBeGreaterThan(0);
      expect(control.description.length).toBeGreaterThan(0);
    }
  });

  it('keeps the shared controls distinct', () => {
    expect(BACK_CONTROL.key).not.toBe(HELP_CONTROL.key);
  });
});
