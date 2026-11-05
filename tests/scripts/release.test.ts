import { describe, expect, it } from 'vitest';
import { nextVersion } from '../../scripts/next-version.js';
import { extractReleaseNotes } from '../../scripts/release-notes.js';

describe('nextVersion', () => {
  it.each([
    ['2.1.0', 'patch', '2.1.1'],
    ['2.1.0', 'minor', '2.2.0'],
    ['2.1.0', 'major', '3.0.0'],
    ['2.1.9', 'minor', '2.2.0'],
    ['1.9.9', 'patch', '1.9.10'],
    ['9.9.9', 'major', '10.0.0']
  ] as const)('bumps %s with %s to %s', (current, bump, expected) => {
    expect(nextVersion(current, bump)).toBe(expected);
  });

  it('refuses a version it cannot bump without guessing', () => {
    // A prerelease is a deliberate, different kind of release; silently
    // stripping the suffix would ship it as stable.
    expect(() => nextVersion('2.1.0-beta.1', 'patch')).toThrow(/plain semantic version/);
    expect(() => nextVersion('2.1', 'patch')).toThrow(/plain semantic version/);
  });
});

const CHANGELOG = `# Changelog

## Unreleased

- nothing yet

## 2.1.0

### Images on cards

A card with a picture now shows it.

- Grid shades follow the daily goal.

### Import

\`anki import deck.apkg\` reads packages.

## 2.0.0

The rewrite.
`;

describe('extractReleaseNotes', () => {
  it('returns one release, up to the next level-two heading', () => {
    const notes = extractReleaseNotes(CHANGELOG, '2.1.0');

    expect(notes).toContain('### Images on cards');
    expect(notes).toContain('`anki import deck.apkg` reads packages.');
    // `###` belongs to the section; only `##` ends it.
    expect(notes).not.toContain('## 2.0.0');
    expect(notes).not.toContain('The rewrite.');
    expect(notes.startsWith('### Images on cards')).toBe(true);
  });

  it('does not treat a prerelease heading as the release', () => {
    // An exact heading, not a prefix match: asking for 2.1.0 must not return
    // the candidate that happens to start with those digits.
    expect(() => extractReleaseNotes('## 2.1.0-rc.1\n\nCandidate.\n', '2.1.0')).toThrow(
      /no "## 2.1.0" section/
    );
  });

  it('fails when the section has not been written', () => {
    expect(() => extractReleaseNotes(CHANGELOG, '9.9.9')).toThrow(/no "## 9.9.9" section/);
  });

  it('fails when the section is empty', () => {
    expect(() => extractReleaseNotes('## 3.0.0\n\n## 2.0.0\n\nOld.\n', '3.0.0')).toThrow(/empty/);
  });
});
