import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', 'src');

/**
 * Collect every external package reachable from an entry module by walking
 * relative imports. Source files import with `.js` specifiers (NodeNext), which
 * resolve to `.ts`/`.tsx` on disk.
 */
function reachablePackages(entry: string): Set<string> {
  const visited = new Set<string>();
  const packages = new Set<string>();

  const readSource = (base: string): string | null => {
    for (const candidate of [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`]) {
      try {
        return readFileSync(candidate, 'utf8');
      } catch {
        continue;
      }
    }
    return null;
  };

  const walk = (file: string): void => {
    if (visited.has(file)) {
      return;
    }
    visited.add(file);

    const source = readSource(file.replace(/\.js$/, ''));
    if (source === null) {
      return;
    }

    // Matches both `from '...'` and side-effect-only `import '...'` (which has
    // no `from` clause and would otherwise slip through). A dynamic
    // `await import('...')` is deliberately NOT matched — `import` is followed
    // by `(` rather than whitespace — because that is precisely the mechanism
    // that keeps Ink off the fast path.
    for (const match of source.matchAll(/\b(?:from|import)\s+['"]([^'"]+)['"]/g)) {
      const specifier = match[1];
      if (specifier.startsWith('.')) {
        walk(resolve(dirname(file), specifier));
      } else {
        packages.add(specifier);
      }
    }
  };

  walk(entry);
  return packages;
}

describe('CLI startup budget', () => {
  const packages = reachablePackages(resolve(SRC, 'cli', 'main.ts'));

  // Ink pulls in React and costs roughly 200ms of startup (measured: ~53ms
  // without it, ~260ms with it). `--help` and `--version` must never pay that,
  // so the interactive app is reached only through a dynamic import.
  it.each(['ink', 'react', 'react/jsx-runtime', 'ink-testing-library'])(
    'does not statically import %s from the CLI entry',
    dependency => {
      expect([...packages]).not.toContain(dependency);
    }
  );

  it('does not reach any ink-* addon package', () => {
    const inkAddons = [...packages].filter(name => name.startsWith('ink-'));
    expect(inkAddons).toEqual([]);
  });

  it('still reaches the packages it genuinely needs', () => {
    expect([...packages]).toContain('node:module');
  });
});
