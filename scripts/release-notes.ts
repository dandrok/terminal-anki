#!/usr/bin/env node
/**
 * Print one release's section of CHANGELOG.md, for the GitHub release body.
 *
 *   node scripts/release-notes.ts 2.2.0
 *
 * Exits non-zero when the section is missing or empty, which is what keeps the
 * release workflow honest: a version cannot be tagged before its notes exist.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * The body under `## <version>`, up to the next level-two heading.
 *
 * Level-three headings belong to the section, so the cut is `##` followed by
 * whitespace only — `###` must not end it.
 */
export function extractReleaseNotes(markdown: string, version: string): string {
  const lines = markdown.split('\n');
  const start = lines.findIndex(line => line.trim() === `## ${version}`);

  if (start === -1) {
    throw new Error(`CHANGELOG.md has no "## ${version}" section`);
  }

  const nextHeading = lines.findIndex((line, index) => index > start && /^##\s/.test(line));
  const body = lines
    .slice(start + 1, nextHeading === -1 ? undefined : nextHeading)
    .join('\n')
    .trim();

  if (body === '') {
    throw new Error(`CHANGELOG.md's "## ${version}" section is empty`);
  }

  return body;
}

/** True when this file was run as a script, false when a test imported it. */
function isMain(): boolean {
  const entry = process.argv[1];
  return entry !== undefined && fileURLToPath(import.meta.url) === entry;
}

if (isMain()) {
  const [version] = process.argv.slice(2);
  if (!version) {
    console.error('usage: release-notes.ts <version>');
    process.exit(1);
  }

  try {
    const changelog = readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8');
    console.log(extractReleaseNotes(changelog, version));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
