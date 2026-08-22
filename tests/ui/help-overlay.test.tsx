import { describe, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';
import { StoreContext } from '../../src/ui/hooks/useStore.js';
import { createStore } from '../../src/state/store.js';
import { emptyPersistedData } from '../../src/storage/serialization.js';
import { QuickStats } from '../../src/ui/screens/QuickStats.js';
import { Achievements } from '../../src/ui/screens/Achievements.js';
import { Analytics } from '../../src/ui/screens/Analytics.js';
import { MainMenu } from '../../src/ui/screens/MainMenu.js';
import type { Repository } from '../../src/storage/repository.js';
import { withRender } from './render.js';

function memoryStore() {
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

function inStore(node: ReactElement): ReactElement {
  return <StoreContext.Provider value={memoryStore()}>{node}</StoreContext.Provider>;
}

const SCREENS: [string, (back: () => void) => ReactElement][] = [
  ['QuickStats', back => <QuickStats onBack={back} />],
  ['Achievements', back => <Achievements onBack={back} />],
  ['Analytics', back => <Analytics onBack={back} />],
  ['MainMenu', back => <MainMenu onSelect={back} />]
];

describe('help overlay', () => {
  it.each(SCREENS)('%s opens help with ?', async (_name, build) => {
    await withRender(inStore(build(vi.fn())), async ({ frame, press }) => {
      expect(frame()).not.toContain('Keys on this screen');
      await press('?');
      expect(frame()).toContain('Keys on this screen');
    });
  });

  it.each(SCREENS)('%s closes help with ? again', async (_name, build) => {
    // useHelp owns closing via useInput(..., { isActive: isHelpOpen }); the
    // screen's own handler must stay behind an isHelpOpen guard or the two
    // would both fire and toggle the overlay straight back open.
    await withRender(inStore(build(vi.fn())), async ({ frame, press }) => {
      await press('?');
      expect(frame()).toContain('Keys on this screen');
      await press('?');
      expect(frame()).not.toContain('Keys on this screen');
    });
  });

  // Closing with Escape is deliberately not tested here: ink-testing-library
  // never delivers a lone ESC byte to useInput — Ink buffers it waiting for the
  // rest of an escape sequence that never arrives, so the handler does not fire
  // at all. Verified instead by driving the built CLI under a pty, which shows
  // the screen sequence STATS -> HELP -> STATS.

  it.each(SCREENS.slice(0, 3))(
    '%s does not navigate away while help is open',
    async (_name, build) => {
      const onBack = vi.fn();
      await withRender(inStore(build(onBack)), async ({ press }) => {
        await press('?');
        await press('q');
        expect(onBack).not.toHaveBeenCalled();
      });
    }
  );
});
