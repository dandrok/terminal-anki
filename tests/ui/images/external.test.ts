import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { findExternalRenderer, renderExternal } from '../../../src/ui/images/external.js';

let workspace: string;
let bin: string;

/** A stand-in for chafa, so the real code path runs without needing it. */
function installStub(body: string, name = 'chafa'): string {
  const file = path.join(bin, name);
  fs.writeFileSync(file, `#!/bin/sh\n${body}\n`);
  fs.chmodSync(file, 0o755);
  return file;
}

beforeEach(() => {
  workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'anki-external-'));
  bin = path.join(workspace, 'bin');
  fs.mkdirSync(bin);
});

afterEach(() => {
  fs.rmSync(workspace, { recursive: true, force: true });
});

describe('findExternalRenderer', () => {
  it('finds a tool on PATH', () => {
    installStub('echo hi');
    const found = findExternalRenderer({ PATH: bin });
    expect(found?.name).toBe('chafa');
    expect(found?.command).toBe(path.join(bin, 'chafa'));
  });

  it('gives back nothing when there is none', () => {
    expect(findExternalRenderer({ PATH: bin })).toBeUndefined();
  });

  it('survives an empty or missing PATH', () => {
    expect(findExternalRenderer({})).toBeUndefined();
    expect(findExternalRenderer({ PATH: '' })).toBeUndefined();
  });

  it('returns an absolute path, not a bare name', () => {
    // So a later PATH change cannot swap the program out from under us.
    installStub('echo hi');
    expect(path.isAbsolute(findExternalRenderer({ PATH: bin })!.command)).toBe(true);
  });
});

describe('renderExternal', () => {
  const renderer = () => ({ name: 'chafa', command: path.join(bin, 'chafa') });

  it('returns the tool output as lines', () => {
    installStub('printf "row one\\nrow two\\n"');
    const lines = renderExternal({
      renderer: renderer(),
      file: 'x.png',
      columns: 10,
      rows: 4
    });
    expect(lines).toEqual(['row one', 'row two']);
  });

  it('passes the size and the file as separate arguments', () => {
    // Never a shell string: the filename comes from somebody else's deck.
    installStub('printf "%s\\n" "$@"');
    const lines = renderExternal({
      renderer: renderer(),
      file: 'a file.png',
      columns: 20,
      rows: 8
    });
    expect(lines).toContain('--size=20x8');
    expect(lines).toContain('a file.png');
  });

  it('does not let a filename reach a shell', () => {
    const canary = path.join(workspace, 'pwned');
    installStub('printf "%s\\n" "$@"');
    renderExternal({
      renderer: renderer(),
      file: `x.png; touch ${canary}`,
      columns: 10,
      rows: 4
    });
    expect(fs.existsSync(canary)).toBe(false);
  });

  it('gives back nothing when the tool fails', () => {
    installStub('exit 3');
    expect(
      renderExternal({ renderer: renderer(), file: 'x.png', columns: 10, rows: 4 })
    ).toBeUndefined();
  });

  it('gives back nothing when the tool is not there', () => {
    expect(
      renderExternal({
        renderer: { name: 'chafa', command: path.join(bin, 'missing') },
        file: 'x.png',
        columns: 10,
        rows: 4
      })
    ).toBeUndefined();
  });

  it('ignores whatever the tool writes to stderr', () => {
    // Its diagnostics would land in the middle of a rendered frame.
    installStub('echo "warning" >&2; echo art');
    expect(renderExternal({ renderer: renderer(), file: 'x.png', columns: 5, rows: 2 })).toEqual([
      'art'
    ]);
  });

  it('trims the trailing blank lines a tool leaves behind', () => {
    installStub('printf "art\\n\\n\\n"');
    expect(renderExternal({ renderer: renderer(), file: 'x.png', columns: 5, rows: 2 })).toEqual([
      'art'
    ]);
  });
});
