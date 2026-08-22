import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', 'src');

/**
 * Every module specifier a source string loads eagerly.
 *
 * Covers all the static forms:
 *   import … from 'x'      / import 'x'        (side-effect, no from clause)
 *   require('x')                               (main.ts sets up createRequire)
 *   import x = require('x')                    (caught by the require branch)
 *
 * A dynamic `await import('x')` is deliberately NOT matched — there `import` is
 * followed by `(` rather than whitespace — because deferring Ink behind a
 * dynamic import is precisely what keeps it off the fast path.
 *
 * `\brequire` does not match `createRequire`: no word boundary mid-word, and the
 * capital R differs anyway.
 */
function scanSpecifiers(source: string): string[] {
  // `import type` and `export type` are erased at compile time and cost
  // nothing at runtime, so counting them would fail the budget for a file that
  // merely names a type from Ink.
  const runtime = source.replace(/^\s*(?:import|export)\s+type\s+[^;]*;?$/gm, '');

  return [
    ...runtime.matchAll(/\b(?:from|import)\s+['"]([^'"]+)['"]/g),
    ...runtime.matchAll(/\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g)
  ].map(match => match[1]);
}

/**
 * Collect every external package reachable from an entry module by walking
 * relative imports. Source files import with `.js` specifiers (NodeNext), which
 * resolve to `.ts`/`.tsx` on disk.
 */
function reachablePackages(entry: string): Set<string> {
  const visited = new Set<string>();
  const packages = new Set<string>();

  const readSource = (base: string): string | null => {
    for (const candidate of [
      base,
      `${base}.ts`,
      `${base}.tsx`,
      `${base}/index.ts`,
      `${base}/index.tsx`
    ]) {
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

    for (const specifier of scanSpecifiers(source)) {
      if (!specifier.startsWith('.')) {
        packages.add(specifier);
      } else if (!specifier.endsWith('.json')) {
        // JSON is data, not an edge in the module graph.
        walk(resolve(dirname(file), specifier));
      }
    }
  };

  walk(entry);
  return packages;
}

/** Bare package specifiers a source string loads eagerly. */
function packagesInSource(source: string): string[] {
  return scanSpecifiers(source).filter(specifier => !specifier.startsWith('.'));
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

  // The scanner has to see every eager form, not just ESM `import`. These pin
  // the shapes that previously slipped through.
  it.each([
    ["import { render } from 'ink';", 'esm named import'],
    ["import 'ink';", 'esm side-effect import'],
    ["const ink = require('ink');", 'commonjs require'],
    ["import ink = require('ink');", 'typescript import-equals'],
    ["const ink = require( 'ink' );", 'require with padding']
  ])('detects %s (%s)', source => {
    expect(packagesInSource(source)).toContain('ink');
  });

  it.each([
    ["const ink = await import('ink');", 'dynamic import'],
    ['const ink = await import(`ink`);', 'dynamic import, template literal'],
    ['const req = createRequire(import.meta.url);', 'createRequire setup'],
    ["import type { Key } from 'ink';", 'type-only import, erased at compile time'],
    ["export type { Key } from 'ink';", 'type-only re-export']
  ])('ignores %s (%s)', source => {
    expect(packagesInSource(source)).not.toContain('ink');
  });
});
