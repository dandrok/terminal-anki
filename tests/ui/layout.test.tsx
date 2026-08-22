import { describe, expect, it } from 'vitest';
import { Text } from 'ink';
import { Layout } from '../../src/ui/components/Layout.js';
import { HELP_CONTROL, type Control } from '../../src/ui/controls.js';
import { withRender } from './render.js';

const CONTROLS: Control[] = [
  { key: 'x', label: 'do thing', description: 'Does the thing' },
  HELP_CONTROL
];

describe('Layout', () => {
  it('draws a persistent header with the title and status', async () => {
    await withRender(
      <Layout title="Terminal Anki" status="5 due">
        <Text>body</Text>
      </Layout>,
      ({ frame }) => {
        expect(frame()).toContain('Terminal Anki');
        expect(frame()).toContain('5 due');
        expect(frame()).toMatch(/[╭╰]/);
      }
    );
  });

  it('renders the body when help is closed', async () => {
    await withRender(
      <Layout title="T" controls={CONTROLS}>
        <Text>the body</Text>
      </Layout>,
      ({ frame }) => {
        expect(frame()).toContain('the body');
        expect(frame()).not.toContain('Keys on this screen');
      }
    );
  });

  it('replaces the body with help rather than overlaying it', async () => {
    // Ink has no z-index, so the swap is what makes an overlay possible at all.
    await withRender(
      <Layout title="T" controls={CONTROLS} isHelpOpen>
        <Text>the body</Text>
      </Layout>,
      ({ frame }) => {
        expect(frame()).toContain('Keys on this screen');
        expect(frame()).not.toContain('the body');
      }
    );
  });

  it('shows the footer key strip whenever controls are given', async () => {
    await withRender(
      <Layout title="T" controls={CONTROLS}>
        <Text>body</Text>
      </Layout>,
      ({ frame }) => {
        expect(frame()).toContain('[x]');
        expect(frame()).toContain('do thing');
      }
    );
  });

  it('omits the footer when a screen declares no controls', async () => {
    await withRender(
      <Layout title="T">
        <Text>body</Text>
      </Layout>,
      ({ frame }) => {
        expect(frame()).not.toContain('[?]');
      }
    );
  });

  it('derives the help overlay from the same controls as the footer', async () => {
    await withRender(
      <Layout title="T" controls={CONTROLS} isHelpOpen>
        <Text>body</Text>
      </Layout>,
      ({ frame }) => {
        // One Control[] drives both renderings, so help cannot drift from keys.
        expect(frame()).toContain('Does the thing');
        expect(frame()).toContain('Show what each key on this screen does');
      }
    );
  });
});
