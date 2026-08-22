import { describe, expect, it } from 'vitest';
import {
  BACK_CONTROL,
  HELP_CONTROL,
  MENU_CONTROLS,
  MOVE_CONTROL,
  READONLY_CONTROLS,
  ROOT_QUIT_CONTROL,
  SELECT_CONTROL,
  keysOf,
  screenControls,
  type Control
} from '../../src/ui/controls.js';

/**
 * Every screen's controls, as the screens themselves build them. If a screen
 * ever stops going through `screenControls`, its entry here should be updated
 * to match — which is the point: the divergence becomes visible.
 */
const SCREENS: [string, readonly Control[]][] = [
  ['menu', MENU_CONTROLS],
  ['read-only screens', READONLY_CONTROLS],
  ['study question', screenControls([{ key: 'space', label: 'reveal', description: 'x' }])],
  ['study answer', screenControls([{ key: '1-5', label: 'grade', description: 'x' }])],
  ['study setup', screenControls([MOVE_CONTROL, SELECT_CONTROL])],
  ['session summary', screenControls([{ key: '⏎', label: 'menu', description: 'x' }])],
  ['analytics', screenControls([{ key: '←→/hl', label: 'view', description: 'x' }])],
  [
    'settings',
    screenControls([
      { key: '↑↓/jk', label: 'field', description: 'x' },
      { key: '←→/hl', label: 'change', description: 'x' },
      { key: '⏎', label: 'save', description: 'x' }
    ])
  ]
];

const ROOT_SCREENS = new Set(['menu']);

describe('screen controls', () => {
  it.each(SCREENS)('%s binds no key twice', (_name, controls) => {
    const keys = keysOf(controls);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it.each(SCREENS)('%s ends with the standard navigation tail', (name, controls) => {
    // The whole point of screenControls: the last entries are identical
    // everywhere, so moving between screens never moves the navigation keys.
    const tail = keysOf(controls).slice(-2);
    expect(tail).toEqual([
      ROOT_SCREENS.has(name) ? ROOT_QUIT_CONTROL.key : BACK_CONTROL.key,
      HELP_CONTROL.key
    ]);
  });

  it('uses the same key pair for leaving every screen', () => {
    // Only the label differs: on the menu, leaving is quitting.
    expect(BACK_CONTROL.key).toBe(ROOT_QUIT_CONTROL.key);
    expect(BACK_CONTROL.label).toBe('back');
    expect(ROOT_QUIT_CONTROL.label).toBe('quit');
  });

  it.each(SCREENS)('%s offers a way out', (_name, controls) => {
    const keys = keysOf(controls);
    expect(keys.some(key => key.includes('esc') || key.includes('q'))).toBe(true);
  });

  it.each(SCREENS)('%s documents its help key', (_name, controls) => {
    expect(controls).toContainEqual(HELP_CONTROL);
  });

  it.each(SCREENS)('%s gives every control a label and a description', (_name, controls) => {
    for (const control of controls) {
      expect(control.key.length).toBeGreaterThan(0);
      expect(control.label.length).toBeGreaterThan(0);
      expect(control.description.length).toBeGreaterThan(0);
    }
  });

  it('gives each shared key exactly one meaning', () => {
    // `q` previously meant quit on the menu, back on the read-only screens and
    // "end session" in study — three meanings for one key.
    expect(new Set([BACK_CONTROL.key, HELP_CONTROL.key]).size).toBe(2);
  });

  it('labels the leave key "quit" on a root screen and "back" elsewhere', () => {
    // The key is the same either way; only what it does differs, because the
    // root has nowhere to go back to.
    expect(screenControls([], { isRoot: true })).toContainEqual(ROOT_QUIT_CONTROL);
    expect(screenControls([])).toContainEqual(BACK_CONTROL);
  });

  it('keeps screen-specific keys ahead of the tail', () => {
    const specific: Control = { key: 'z', label: 'zap', description: 'x' };
    expect(keysOf(screenControls([specific]))[0]).toBe('z');
  });

  it('never collides a screen-specific key with a navigation key', () => {
    const reserved = new Set([BACK_CONTROL.key, HELP_CONTROL.key, 'q', 'esc']);
    for (const [, controls] of SCREENS) {
      const specific = controls.slice(0, -2);
      for (const control of specific) {
        expect(reserved.has(control.key)).toBe(false);
      }
    }
  });
});
