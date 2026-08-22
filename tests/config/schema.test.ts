import { describe, expect, it } from 'vitest';
import {
  CONFIG_VERSION,
  DEFAULT_CONFIG,
  LIMITS,
  clamp,
  normalizeConfig,
  withConfig
} from '../../src/config/schema.js';
import { THEME_IDS } from '../../src/ui/theme/palette.js';

describe('clamp', () => {
  it('keeps a value inside its bounds', () => {
    expect(clamp(5, 1, 10)).toBe(5);
    expect(clamp(-3, 1, 10)).toBe(1);
    expect(clamp(99, 1, 10)).toBe(10);
  });
});

describe('normalizeConfig', () => {
  it.each([null, undefined, 42, 'nope', [], true])('falls back to defaults for %j', input => {
    expect(normalizeConfig(input)).toEqual(DEFAULT_CONFIG);
  });

  it('keeps a valid config as it is', () => {
    const config = {
      version: CONFIG_VERSION,
      theme: 'dracula',
      dailyGoal: 40,
      heatmapWeeks: 8,
      defaultSessionLength: 25,
      shuffle: false
    };
    expect(normalizeConfig(config)).toEqual(config);
  });

  it('accepts every theme it ships with', () => {
    for (const theme of THEME_IDS) {
      expect(normalizeConfig({ theme }).theme).toBe(theme);
    }
  });

  it('falls back on a theme that no longer exists', () => {
    // A theme removed in a later release must not leave the app uncoloured.
    expect(normalizeConfig({ theme: 'solarized-from-2019' }).theme).toBe(DEFAULT_CONFIG.theme);
  });

  it('clamps rather than rejecting an out-of-range number', () => {
    // Settings are not data: a hand-edited file should still start the app.
    expect(normalizeConfig({ dailyGoal: 100_000 }).dailyGoal).toBe(LIMITS.dailyGoal.max);
    expect(normalizeConfig({ dailyGoal: 0 }).dailyGoal).toBe(LIMITS.dailyGoal.min);
    expect(normalizeConfig({ heatmapWeeks: 500 }).heatmapWeeks).toBe(LIMITS.heatmapWeeks.max);
    expect(normalizeConfig({ heatmapWeeks: 1 }).heatmapWeeks).toBe(LIMITS.heatmapWeeks.min);
  });

  it.each([NaN, Infinity, -Infinity, '20', null])(
    'ignores %j where a number belongs',
    dailyGoal => {
      expect(normalizeConfig({ dailyGoal }).dailyGoal).toBe(DEFAULT_CONFIG.dailyGoal);
    }
  );

  it('rounds a fractional number instead of storing it', () => {
    expect(normalizeConfig({ heatmapWeeks: 7.6 }).heatmapWeeks).toBe(8);
  });

  it('treats null session length as a real choice, not a missing value', () => {
    expect(normalizeConfig({ defaultSessionLength: null }).defaultSessionLength).toBeNull();
    expect(normalizeConfig({ defaultSessionLength: 25 }).defaultSessionLength).toBe(25);
    expect(normalizeConfig({ defaultSessionLength: 'lots' }).defaultSessionLength).toBeNull();
  });

  it('keeps the good fields when one is broken', () => {
    // One bad entry must not discard the rest of somebody\'s settings.
    const config = normalizeConfig({ theme: 'forest', dailyGoal: 'banana', shuffle: false });
    expect(config.theme).toBe('forest');
    expect(config.shuffle).toBe(false);
    expect(config.dailyGoal).toBe(DEFAULT_CONFIG.dailyGoal);
  });

  it('stamps the current version over whatever was on disk', () => {
    expect(normalizeConfig({ version: 99 }).version).toBe(CONFIG_VERSION);
  });

  it('does not return the shared default object', () => {
    // Handing out the module-level default would let one caller mutate it for
    // everyone else.
    const config = normalizeConfig(null);
    config.dailyGoal = 999;
    expect(DEFAULT_CONFIG.dailyGoal).not.toBe(999);
  });
});

describe('withConfig', () => {
  it('applies a patch', () => {
    expect(withConfig(DEFAULT_CONFIG, { shuffle: false }).shuffle).toBe(false);
  });

  it('re-clamps whatever the patch touched', () => {
    expect(withConfig(DEFAULT_CONFIG, { dailyGoal: 10_000 }).dailyGoal).toBe(LIMITS.dailyGoal.max);
  });

  it('leaves the original untouched', () => {
    const before = { ...DEFAULT_CONFIG };
    withConfig(DEFAULT_CONFIG, { theme: 'mono' });
    expect(DEFAULT_CONFIG).toEqual(before);
  });
});
