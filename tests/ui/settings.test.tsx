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
        await press('j');
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

  it('previews the staged theme on the real frame', async () => {
    // The point of staging into ThemeContext rather than a mock preview: the
    // header and footer people actually look at are the ones being recoloured.
    await withRender(
      withConfigContext(<Settings onBack={vi.fn()} />, DEFAULT_CONFIG),
      async ({ frame, press }) => {
        const before = frame();
        // Two steps along: default → forest → mono, which is visibly different.
        await press('l');
        await press('l');
        expect(frame()).toContain('Monochrome');
        expect(frame()).not.toBe(before);
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
        await press('j');
        await press('lll');
        expect(frame()).toContain('200 cards a day');
      }
    );
  });

  it('steps once per keystroke in a single chunk', async () => {
    await withRender(
      withConfigContext(<Settings onBack={vi.fn()} />, DEFAULT_CONFIG),
      async ({ frame, press }) => {
        // One chunk: row down, then three steps on that row.
        await press('jlll');
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
