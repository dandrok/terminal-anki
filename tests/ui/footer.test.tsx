import { describe, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';
import { StoreContext } from '../../src/ui/hooks/useStore.js';
import { createStore, type Store } from '../../src/state/store.js';
import { emptyPersistedData } from '../../src/storage/serialization.js';
import { selectCards } from '../../src/state/selectors.js';
import { MainMenu } from '../../src/ui/screens/MainMenu.js';
import { QuickStats } from '../../src/ui/screens/QuickStats.js';
import { Achievements } from '../../src/ui/screens/Achievements.js';
import { Analytics } from '../../src/ui/screens/Analytics.js';
import { Settings } from '../../src/ui/screens/Settings.js';
import { Browse } from '../../src/ui/screens/Browse.js';
import { CardForm } from '../../src/ui/screens/CardForm.js';
import { CustomStudySetup } from '../../src/ui/screens/CustomStudySetup.js';
import { StudySetup } from '../../src/ui/screens/StudySetup.js';
import { StudyFlow } from '../../src/ui/screens/StudyFlow.js';
import { Study } from '../../src/ui/screens/Study.js';
import { SessionSummary } from '../../src/ui/screens/SessionSummary.js';
import type { Repository } from '../../src/storage/repository.js';
import { withRender } from './render.js';

const RETURN = String.fromCharCode(13);
const NOW = new Date();

function memoryStore(cards = 3): Store {
  let stored = emptyPersistedData();
  const repository: Repository = {
    dataFile: '/virtual/f.json',
    load: () => ({ data: stored, isNew: false }),
    save: data => {
      stored = data;
    },
    isReadOnly: () => false
  };
  const store = createStore({ repository, seedSampleCards: false });
  for (let i = 0; i < cards; i++) {
    store.dispatch({ type: 'card/add', front: `Card ${i}`, back: `A${i}`, tags: ['t'], now: NOW });
  }
  return store;
}

const store = memoryStore();
const cards = [...selectCards(store.getSnapshot())];

function inStore(node: ReactElement): ReactElement {
  return <StoreContext.Provider value={store}>{node}</StoreContext.Provider>;
}

const noop = vi.fn();

/**
 * Every screen, plus the keystrokes that reach its other modes.
 *
 * A rendering inventory rather than a list of expected control arrays: a
 * hand-written copy of what each screen *should* bind drifts silently the
 * moment a screen changes, which is exactly the failure this is here to catch.
 */
type Fixture = [name: string, node: ReactElement, keys: string[], isTextInput?: boolean];

const FOOTERS: Fixture[] = [
  ['menu', inStore(<MainMenu onSelect={noop} onQuit={noop} />), []],
  ['quick stats', inStore(<QuickStats onBack={noop} onQuit={noop} />), []],
  ['achievements', inStore(<Achievements onBack={noop} onQuit={noop} />), []],
  ['analytics activity', inStore(<Analytics onBack={noop} onQuit={noop} />), []],
  ['analytics sessions', inStore(<Analytics onBack={noop} onQuit={noop} />), ['l']],
  ['analytics tags', inStore(<Analytics onBack={noop} onQuit={noop} />), ['ll']],
  ['settings', <Settings onBack={noop} />, []],
  ['browse list', inStore(<Browse onBack={noop} onEdit={noop} />), []],
  ['browse filter', inStore(<Browse onBack={noop} onEdit={noop} />), ['/'], true],
  ['browse confirm', inStore(<Browse onBack={noop} onEdit={noop} />), ['d']],
  ['card form', <CardForm onSave={noop} onCancel={noop} />, [], true],
  ['card form editing', <CardForm card={cards[0]} onSave={noop} onCancel={noop} />, [], true],
  [
    'custom study setup',
    <CustomStudySetup allTags={['t']} matchCount={() => 3} onStart={noop} onCancel={noop} />,
    []
  ],
  ['study setup', <StudySetup dueCount={9} onStart={noop} onCancel={noop} onQuit={noop} />, []],
  [
    'study setup stepper',
    <StudySetup dueCount={9} onStart={noop} onCancel={noop} onQuit={noop} />,
    ['jj', RETURN]
  ],
  ['study question', inStore(<Study cards={cards} onFinish={noop} />), []],
  ['study answer', inStore(<Study cards={cards} onFinish={noop} />), [' ']],
  [
    'session summary',
    <SessionSummary
      studied={3}
      correctAnswers={2}
      skipped={0}
      remainingDue={1}
      quitEarly={false}
      onDone={noop}
      onQuit={noop}
    />,
    []
  ],
  ['nothing due', inStore(<StudyFlow onExit={noop} onQuit={noop} />), []]
];

/** The `[key]` tokens of the footer strip, in order. */
function footerKeys(frame: string): string[] {
  const lines = frame.split('\n').filter(line => /\[[^\]]+\]/.test(line));
  const footer = lines.at(-1) ?? '';
  return [...footer.matchAll(/\[([^\]]+)\]/g)].map(match => match[1]);
}

describe('every screen', () => {
  it.each(FOOTERS)('%s ends its footer the standard way', async (_name, node, keys, isText) => {
    // The whole point of the shared tail: moving between screens never moves
    // the navigation keys or changes what they do. A screen capturing text is
    // the one exception, and it is explicit — q and ? type there, so the strip
    // names Escape instead of pointing at keys that do something else.
    await withRender(node, async ({ frame, press }) => {
      for (const key of keys) {
        await press(key);
      }
      const found = footerKeys(frame());
      expect(isText ? found.slice(-1) : found.slice(-2)).toEqual(isText ? ['esc'] : ['q/esc', '?']);
    });
  });

  it.each(FOOTERS)('%s always offers a way out', async (_name, node, keys) => {
    await withRender(node, async ({ frame, press }) => {
      for (const key of keys) {
        await press(key);
      }
      expect(footerKeys(frame()).some(key => key.includes('esc'))).toBe(true);
    });
  });

  it.each(FOOTERS)('%s binds no key twice in its footer', async (_name, node, keys) => {
    await withRender(node, async ({ frame, press }) => {
      for (const key of keys) {
        await press(key);
      }
      const found = footerKeys(frame());
      expect(new Set(found).size).toBe(found.length);
    });
  });

  it.each(FOOTERS.filter(fixture => !fixture[3]))(
    '%s documents its keys in the help overlay',
    async (_name, node, keys) => {
      await withRender(node, async ({ frame, press }) => {
        for (const key of keys) {
          await press(key);
        }
        const before = footerKeys(frame());
        await press('?');

        const help = frame();
        expect(help).toContain('Keys on this screen');
        // Every key in the strip is explained, so the footer is never a list of
        // symbols with nowhere to look them up.
        for (const key of before) {
          expect(help).toContain(`[${key}]`);
        }
      });
    }
  );

  it.each(FOOTERS.filter(fixture => fixture[3]))(
    '%s treats ? as a character rather than the help key',
    async (_name, node, keys) => {
      // Which is exactly why its footer must not advertise [?] help.
      await withRender(node, async ({ frame, press }) => {
        for (const key of keys) {
          await press(key);
        }
        await press('?');
        expect(frame()).not.toContain('Keys on this screen');
        expect(frame()).toContain('?');
      });
    }
  );
});
