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

  it('returns the tool output as lines', async () => {
    installStub('printf "row one\\nrow two\\n"');
    await expect(
      renderExternal({ renderer: renderer(), file: 'x.png', columns: 10, rows: 4 })
    ).resolves.toEqual(['row one', 'row two']);
  });

  it('does not block while the tool works', async () => {
    // It used to run synchronously from a render, so the whole interface
    // stopped for however long the tool took, up to the timeout.
    installStub('sleep 0.3; echo art');
    let settled = false;
    const pending = renderExternal({
      renderer: renderer(),
      file: 'x.png',
      columns: 5,
      rows: 2
    }).then(value => {
      settled = true;
      return value;
    });

    expect(settled).toBe(false);
    await expect(pending).resolves.toEqual(['art']);
  });

  it('passes the size and the file as separate arguments', async () => {
    // Never a shell string: the filename comes from somebody else's deck.
    installStub('printf "%s\\n" "$@"');
    const lines = await renderExternal({
      renderer: renderer(),
      file: 'a file.png',
      columns: 20,
      rows: 8
    });
    expect(lines).toContain('--size=20x8');
    expect(lines).toContain('a file.png');
  });

  it('does not let a filename reach a shell', async () => {
    const canary = path.join(workspace, 'pwned');
    installStub('printf "%s\\n" "$@"');
    await renderExternal({
      renderer: renderer(),
      file: `x.png; touch ${canary}`,
      columns: 10,
      rows: 4
    });
    expect(fs.existsSync(canary)).toBe(false);
  });

  it('gives back nothing when the tool fails', async () => {
    installStub('exit 3');
    await expect(
      renderExternal({ renderer: renderer(), file: 'x.png', columns: 10, rows: 4 })
    ).resolves.toBeUndefined();
  });

  it('gives back nothing when the tool is not there', async () => {
    await expect(
      renderExternal({
        renderer: { name: 'chafa', command: path.join(bin, 'missing') },
        file: 'x.png',
        columns: 10,
        rows: 4
      })
    ).resolves.toBeUndefined();
  });

  it('ignores whatever the tool writes to stderr', async () => {
    // Its diagnostics would land in the middle of a rendered frame.
    installStub('echo "warning" >&2; echo art');
    await expect(
      renderExternal({ renderer: renderer(), file: 'x.png', columns: 5, rows: 2 })
    ).resolves.toEqual(['art']);
  });

  it('trims the trailing blank lines a tool leaves behind', async () => {
    installStub('printf "art\\n\\n\\n"');
    await expect(
      renderExternal({ renderer: renderer(), file: 'x.png', columns: 5, rows: 2 })
    ).resolves.toEqual(['art']);
  });

  it('gives back nothing when the tool prints nothing', async () => {
    installStub('true');
    await expect(
      renderExternal({ renderer: renderer(), file: 'x.png', columns: 5, rows: 2 })
    ).resolves.toBeUndefined();
  });
});
