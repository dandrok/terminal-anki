import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = path.join(process.cwd(), 'src');

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return sourceFiles(full);
    }
    return /\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

/** Relative specifiers in a file, resolved to `src`-relative paths. */
function importsOf(file: string): string[] {
  const source = fs.readFileSync(file, 'utf-8');
  const specifiers = [...source.matchAll(/from\s+['"](\.[^'"]+)['"]/g)].map(match => match[1]);
  return specifiers.map(specifier =>
    path.relative(SRC, path.resolve(path.dirname(file), specifier)).replaceAll(path.sep, '/')
  );
}

const FILES = sourceFiles(SRC);

/**
 * The layering the README documents, enforced.
 *
 * Claims about architecture rot the moment nothing checks them, and this one is
 * load-bearing: `core/` staying free of I/O and of React is what lets the
 * learning rules be tested without a terminal or a filesystem.
 */
const RULES: [layer: string, forbidden: RegExp][] = [
  ['core', /^(state|storage|config|ui|cli)\//],
  ['state', /^(ui|cli)\//],
  ['storage', /^(state|cli)\//],
  ['config', /^(state|storage|cli)\//],
  ['ui', /^cli\//],
  ['types', /^(core|state|storage|config|ui|cli)\//]
];

describe('layering', () => {
  it.each(RULES)('src/%s does not import upwards', (layer, forbidden) => {
    const offenders = FILES.filter(file =>
      path.relative(SRC, file).replaceAll(path.sep, '/').startsWith(`${layer}/`)
    ).flatMap(file =>
      importsOf(file)
        .filter(target => forbidden.test(target))
        .map(target => `${path.relative(SRC, file)} -> ${target}`)
    );

    expect(offenders).toEqual([]);
  });

  it('keeps core/ free of every project module but itself and types/', () => {
    // The one rule the whole test suite depends on.
    const coreFiles = FILES.filter(file =>
      path.relative(SRC, file).replaceAll(path.sep, '/').startsWith('core/')
    );
    expect(coreFiles.length).toBeGreaterThan(5);

    for (const file of coreFiles) {
      for (const target of importsOf(file)) {
        expect(target).toMatch(/^(core|types)\//);
      }
    }
  });

  it('keeps the filesystem out of core/ and state/', () => {
    // Not every node: import — core/ids.ts uses node:crypto for randomUUID,
    // which costs it nothing in testability. Reaching for the filesystem or the
    // process is what would stop these layers being testable without either.
    const forbidden = /from\s+['"]node:(fs|fs\/promises|os|path|child_process|process)['"]/;
    for (const file of FILES) {
      const relative = path.relative(SRC, file).replaceAll(path.sep, '/');
      if (!relative.startsWith('core/') && !relative.startsWith('state/')) {
        continue;
      }
      expect(fs.readFileSync(file, 'utf-8')).not.toMatch(forbidden);
    }
  });

  it('keeps React and Ink out of everything below ui/', () => {
    for (const file of FILES) {
      const relative = path.relative(SRC, file).replaceAll(path.sep, '/');
      if (relative.startsWith('ui/') || relative.startsWith('cli/')) {
        continue;
      }
      expect(fs.readFileSync(file, 'utf-8')).not.toMatch(/from\s+['"](react|ink)['"]/);
    }
  });

  it('has no classes anywhere', () => {
    // v2 replaced all three of them with closure factories; this is what stops
    // a fourth appearing.
    const offenders = FILES.filter(file =>
      /^\s*(export\s+)?(abstract\s+)?class\s/m.test(fs.readFileSync(file, 'utf-8'))
    );
    expect(offenders).toEqual([]);
  });

  it('has no import cycles', () => {
    const graph = new Map<string, string[]>();
    for (const file of FILES) {
      const key = path.relative(SRC, file).replaceAll(path.sep, '/');
      graph.set(
        key,
        importsOf(file)
          .map(target =>
            ['.ts', '.tsx']
              .map(extension => `${target}${extension}`)
              .find(candidate => fs.existsSync(path.join(SRC, candidate)))
          )
          .filter((target): target is string => target !== undefined)
      );
    }

    const done = new Set<string>();
    const open = new Set<string>();
    const cycles: string[] = [];

    const visit = (node: string, stack: string[]): void => {
      if (done.has(node)) {
        return;
      }
      if (open.has(node)) {
        cycles.push([...stack.slice(stack.indexOf(node)), node].join(' -> '));
        return;
      }
      open.add(node);
      for (const next of graph.get(node) ?? []) {
        visit(next, [...stack, node]);
      }
      open.delete(node);
      done.add(node);
    };

    for (const file of graph.keys()) {
      visit(file, []);
    }

    expect(cycles).toEqual([]);
  });
});
