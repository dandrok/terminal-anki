#!/usr/bin/env node
/**
 * Work out the next release version from package.json.
 *
 * Lives here rather than in the workflow so the rule is one line of code that
 * can be tested, instead of a shell pipeline nobody re-reads. `npm version
 * <bump> --dry-run` is not used: it still writes package.json.
 *
 *   node scripts/next-version.ts minor   # 2.2.0
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export type Bump = 'patch' | 'minor' | 'major';

export const BUMPS: readonly Bump[] = ['patch', 'minor', 'major'];

/** Plain `x.y.z` only: a prerelease bump means something else, and is manual. */
const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/;

export function nextVersion(current: string, bump: Bump): string {
  const match = SEMVER.exec(current.trim());
  if (!match) {
    throw new Error(`"${current}" is not a plain semantic version (x.y.z)`);
  }

  const major = Number(match[1]);
  const minor = Number(match[2]);
  const patch = Number(match[3]);

  switch (bump) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
      return `${major}.${minor}.${patch + 1}`;
  }
}

function isMain(): boolean {
  const entry = process.argv[1];
  return entry !== undefined && fileURLToPath(import.meta.url) === entry;
}

if (isMain()) {
  const [kind] = process.argv.slice(2);
  if (!BUMPS.includes(kind as Bump)) {
    console.error(`usage: next-version.ts <${BUMPS.join('|')}>`);
    process.exit(1);
  }

  try {
    const { version } = JSON.parse(
      readFileSync(new URL('../package.json', import.meta.url), 'utf8')
    ) as { version: string };
    console.log(nextVersion(version, kind as Bump));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
