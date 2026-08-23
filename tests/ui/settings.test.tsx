import { describe, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';
import { ConfigContext } from '../../src/ui/hooks/useConfig.js';
import { Settings } from '../../src/ui/screens/Settings.js';
import { Analytics } from '../../src/ui/screens/Analytics.js';
import { StudySetup } from '../../src/ui/screens/StudySetup.js';
import { CustomStudySetup } from '../../src/ui/screens/CustomStudySetup.js';
import { StoreContext } from '../../src/ui/hooks/useStore.js';
import { createStore, type Store } from '../../src/state/store.js';
import { emptyPersistedData } from '../../src/storage/serialization.js';
import { DEFAULT_CONFIG, withConfig, type AppConfig } from '../../src/config/schema.js';
import type { Repository } from '../../src/storage/repository.js';
import { withRender } from './render.js';

const RETURN = String.fromCharCode(13);

/**
 * Keystrokes that walk the cursor down to a named row.
 *
 * By name rather than by counting: these tests used a fixed number of `j`
 * presses, so adding a setting silently pointed them at the wrong row.
 */
const FIELD_ORDER = ['Theme', 'Images', 'Daily goal', 'History span', 'Session size', 'Card order'];

function downTo(label: string): string {
  const at = FIELD_ORDER.indexOf(label);
  if (at < 0) {
    throw new Error(`no settings row called ${label}`);
  }
  return 'j'.repeat(at);
}

function withConfigContext(
  node: ReactElement,
  config: AppConfig,
  update: (patch: Partial<AppConfig>) => void = vi.fn()
): ReactElement {
  return <ConfigContext.Provider value={{ config, update }}>{node}</ConfigContext.Provider>;
}

function emptyStore(): Store {
  let stored = emptyPersistedData();
  const repository: Repository = {
    dataFile: '/virtual/f.json',
    load: () => ({ data: stored, isNew: false }),
    save: data => {
      stored = data;
    },
    isReadOnly: () => false
  };
  return createStore({ repository, seedSampleCards: false });
}

describe('Settings', () => {
  it('shows the stored values', async () => {
    const config = withConfig(DEFAULT_CONFIG, { theme: 'dracula', dailyGoal: 35, shuffle: false });
    await withRender(withConfigContext(<Settings onBack={vi.fn()} />, config), ({ frame }) => {
      expect(frame()).toContain('Settings');
      expect(frame()).toContain('Dracula');
      expect(frame()).toContain('35 cards a day');
      expect(frame()).toContain('as listed');
      expect(frame()).toContain('saved');
    });
  });

  it('stages a change without writing it', async () => {
    const update = vi.fn();
    await withRender(
      withConfigContext(<Settings onBack={vi.fn()} />, DEFAULT_CONFIG, update),
      async ({ frame, press }) => {
        await press('l');
        expect(frame()).toContain('Forest');
        expect(frame()).toContain('unsaved');
        expect(update).not.toHaveBeenCalled();
      }
    );
  });

  it('writes the whole draft on ⏎ and leaves', async () => {
    const update = vi.fn();
    const onBack = vi.fn();
    await withRender(
      withConfigContext(<Settings onBack={onBack} />, DEFAULT_CONFIG, update),
      async ({ press }) => {
        await press('l');
        for (const key of downTo('Daily goal')) {
          await press(key);
        }
        await press('l');
        await press(RETURN);
      }
    );

    expect(update).toHaveBeenCalledOnce();
    expect(update.mock.calls[0][0]).toMatchObject({
      theme: 'forest',
      dailyGoal: DEFAULT_CONFIG.dailyGoal + 5
    });
    expect(onBack).toHaveBeenCalledOnce();
  });

  it('discards the draft on q', async () => {
    const update = vi.fn();
    const onBack = vi.fn();
    await withRender(
      withConfigContext(<Settings onBack={onBack} />, DEFAULT_CONFIG, update),
      async ({ press }) => {
        await press('l');
        await press('q');
      }
    );

    expect(update).not.toHaveBeenCalled();
    expect(onBack).toHaveBeenCalledOnce();
  });

  it('cycles through every theme it ships with', async () => {
    // The recolouring itself cannot be asserted here: ink-testing-library
    // renders without a TTY, so chalk strips the escape codes and every theme
    // produces a byte-identical frame. Verified under a pty instead, where
    // staging Forest replaces cyanBright (\\e[96m) with green (\\e[32m) across the
    // whole frame — header and footer included — and leaving without saving
    // writes no config file.
    await withRender(
      withConfigContext(<Settings onBack={vi.fn()} />, DEFAULT_CONFIG),
      async ({ frame, press }) => {
        for (const label of ['Forest', 'Monochrome', 'Dracula', 'Default']) {
          await press('l');
          expect(frame()).toContain(label);
        }
      }
    );
  });

  it('offers the image modes and says what each would give you', async () => {
    await withRender(
      withConfigContext(<Settings onBack={vi.fn()} />, DEFAULT_CONFIG),
      async ({ frame, press }) => {
        await press(downTo('Images'));
        expect(frame()).toContain('Images');
        // "automatic" alone says nothing; the outcome is the useful half.
        expect(frame()).toMatch(/automatic · (full resolution|coloured blocks|filenames only)/);

        await press('l');
        expect(frame()).toContain('kitty protocol');
      }
    );
  });

  it('clamps at the ends instead of refusing the keystroke', async () => {
    await withRender(
      withConfigContext(
        <Settings onBack={vi.fn()} />,
        withConfig(DEFAULT_CONFIG, { dailyGoal: 200 })
      ),
      async ({ frame, press }) => {
        await press(downTo('Daily goal'));
        await press('lll');
        expect(frame()).toContain('200 cards a day');
      }
    );
  });

  it('steps once per keystroke in a single chunk', async () => {
    await withRender(
      withConfigContext(<Settings onBack={vi.fn()} />, DEFAULT_CONFIG),
      async ({ frame, press }) => {
        // One chunk: down to the goal row, then three steps along it.
        await press(`${downTo('Daily goal')}lll`);
        expect(frame()).toContain('Daily goal');
        expect(frame()).toContain(`${DEFAULT_CONFIG.dailyGoal + 15} cards a day`);
      }
    );
  });

  it('ends its footer with the standard navigation tail', async () => {
    await withRender(
      withConfigContext(<Settings onBack={vi.fn()} />, DEFAULT_CONFIG),
      ({ frame }) => {
        const output = frame();
        expect(output).toContain('save');
        expect(output.indexOf('back')).toBeLessThan(output.indexOf('help'));
      }
    );
  });
});

describe('settings reach the screens that use them', () => {
  it('sizes the heatmap and its legend from the daily goal', async () => {
    const config = withConfig(DEFAULT_CONFIG, { dailyGoal: 45, heatmapWeeks: 6 });
    await withRender(
      withConfigContext(
        <StoreContext.Provider value={emptyStore()}>
          <Analytics onBack={vi.fn()} onQuit={vi.fn()} />
        </StoreContext.Provider>,
        config
      ),
      ({ frame }) => {
        expect(frame()).toContain('45 cards/day');
        expect(frame()).toContain('in 6 weeks');
      }
    );
  });

  it('preselects the configured session size', async () => {
    await withRender(
      withConfigContext(
        <StudySetup dueCount={80} onStart={vi.fn()} onCancel={vi.fn()} onQuit={vi.fn()} />,
        withConfig(DEFAULT_CONFIG, { defaultSessionLength: 25 })
      ),
      ({ frame }) => {
        expect(frame()).toContain('❯ Study 25 cards');
      }
    );
  });

  it('falls back to the first row when that size is not on offer today', async () => {
    // A standing preference for 50 must not leave nothing selected on a day
    // with 12 cards due.
    await withRender(
      withConfigContext(
        <StudySetup dueCount={12} onStart={vi.fn()} onCancel={vi.fn()} onQuit={vi.fn()} />,
        withConfig(DEFAULT_CONFIG, { defaultSessionLength: 50 })
      ),
      ({ frame }) => {
        expect(frame()).toContain('❯ Study all due cards');
      }
    );
  });

  it('starts a custom session in the configured order', async () => {
    await withRender(
      withConfigContext(
        <CustomStudySetup allTags={[]} matchCount={() => 3} onStart={vi.fn()} onCancel={vi.fn()} />,
        withConfig(DEFAULT_CONFIG, { shuffle: false })
      ),
      ({ frame }) => {
        expect(frame()).toContain('as listed');
      }
    );
  });
});
