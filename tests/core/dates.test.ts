import { afterEach, describe, expect, it } from 'vitest';
import { daysBetween, startOfDay, toDateKey } from '../../src/core/dates.js';

function restoreTz(original: string | undefined): void {
  if (original === undefined) {
    delete process.env.TZ;
  } else {
    process.env.TZ = original;
  }
}

describe('toDateKey', () => {
  const originalTz = process.env.TZ;

  afterEach(() => {
    // Assigning `undefined` would set the literal string "undefined", which
    // Node treats as an invalid zone and silently falls back to UTC.
    restoreTz(originalTz);
  });

  it.each([
    ['UTC', '2026-08-22'],
    ['Europe/Warsaw', '2026-08-22'],
    ['America/Los_Angeles', '2026-08-22'],
    ['Pacific/Kiritimati', '2026-08-22'],
    ['Pacific/Niue', '2026-08-22']
  ])('uses the local calendar day in %s', (timezone, expected) => {
    // Regression: toISOString() converted local midnight to UTC first, so
    // every timezone ahead of Greenwich recorded the previous day.
    process.env.TZ = timezone;
    expect(toDateKey(new Date(2026, 7, 22, 0, 0, 0))).toBe(expected);
  });

  it('zero-pads single-digit months and days', () => {
    expect(toDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('startOfDay', () => {
  it('strips the time component', () => {
    const start = startOfDay(new Date(2026, 7, 22, 23, 59, 58, 999));
    expect([start.getHours(), start.getMinutes(), start.getSeconds()]).toEqual([0, 0, 0]);
    expect(start.getDate()).toBe(22);
  });
});

describe('daysBetween', () => {
  it('counts whole calendar days', () => {
    expect(daysBetween(new Date(2026, 7, 20), new Date(2026, 7, 22))).toBe(2);
  });

  it('ignores the time of day', () => {
    expect(daysBetween(new Date(2026, 7, 21, 23, 0), new Date(2026, 7, 22, 1, 0))).toBe(1);
  });

  it('returns zero within the same day', () => {
    expect(daysBetween(new Date(2026, 7, 22, 1, 0), new Date(2026, 7, 22, 23, 0))).toBe(0);
  });

  it('returns a negative count when going backwards', () => {
    expect(daysBetween(new Date(2026, 7, 22), new Date(2026, 7, 20))).toBe(-2);
  });

  it('survives a daylight-saving transition', () => {
    const originalTz = process.env.TZ;
    try {
      process.env.TZ = 'Europe/Warsaw';
      // DST ends 2026-10-25 in Warsaw; that day is 25 hours long.
      expect(daysBetween(new Date(2026, 9, 24), new Date(2026, 9, 26))).toBe(2);
    } finally {
      restoreTz(originalTz);
    }
  });
});
