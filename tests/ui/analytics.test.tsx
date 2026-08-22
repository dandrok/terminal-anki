import { describe, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';
import { StoreContext } from '../../src/ui/hooks/useStore.js';
import { createStore, type Store } from '../../src/state/store.js';
import { emptyPersistedData } from '../../src/storage/serialization.js';
import { Analytics } from '../../src/ui/screens/Analytics.js';
import { Heatmap, HeatmapLegend } from '../../src/ui/components/Heatmap.js';
import { StackedBar } from '../../src/ui/components/StackedBar.js';
import { buildHeatmap } from '../../src/ui/charts/heatmap.js';
import { getTheme } from '../../src/ui/theme/palette.js';
import { selectAccuracyTrend, selectDailyCardCounts } from '../../src/state/selectors.js';
import type { Repository } from '../../src/storage/repository.js';
import { withRender } from './render.js';

const NOW = new Date(2026, 7, 22, 12, 0);
const THEME = getTheme('default');

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

function seededStore(): Store {
  const store = emptyStore();

  store.dispatch({ type: 'card/add', front: 'Q', back: 'A', tags: ['verbs'], now: NOW });
  store.dispatch({ type: 'card/add', front: 'Q2', back: 'A2', tags: ['verbs'], now: NOW });
  store.dispatch({ type: 'card/add', front: 'Q3', back: 'A3', tags: ['nouns'], now: NOW });

  const days: [Date, number, number][] = [
    [new Date(2026, 7, 20, 9, 0), 12, 10],
    [new Date(2026, 7, 21, 9, 0), 25, 20],
    [new Date(2026, 7, 22, 9, 0), 4, 1]
  ];
  for (const [startTime, cardsStudied, correctAnswers] of days) {
    store.dispatch({
      type: 'session/record',
      now: NOW,
      session: {
        startTime,
        endTime: new Date(startTime.getTime() + 10 * 60_000),
        cardsStudied,
        correctAnswers,
        incorrectAnswers: cardsStudied - correctAnswers,
        averageDifficulty: 3,
        sessionType: 'due',
        quitEarly: false
      }
    });
  }
  return store;
}

function inStore(store: Store, node: ReactElement): ReactElement {
  return <StoreContext.Provider value={store}>{node}</StoreContext.Provider>;
}

describe('Heatmap', () => {
  it('draws seven rows with alternating weekday labels', async () => {
    const grid = buildHeatmap(new Map(), { now: NOW, weeks: 6 });
    await withRender(<Heatmap grid={grid} theme={THEME} />, ({ frame }) => {
      const output = frame();
      expect(output).toContain('Mon');
      expect(output).toContain('Wed');
      expect(output).toContain('Fri');
      expect(output).toContain('Sun');
      // Alternating: the odd rows are unlabelled.
      expect(output).not.toContain('Tue');
      expect(output).not.toContain('Sat');
    });
  });

  it('gives every day two columns so the cells are roughly square', async () => {
    const grid = buildHeatmap(new Map(), { now: NOW, weeks: 6 });
    await withRender(<Heatmap grid={grid} theme={THEME} />, ({ frame }) => {
      // Monday has happened in all six weeks, so its row is full width.
      const monday = frame()
        .split('\n')
        .find(line => line.includes('Mon'));
      expect(monday).toBeDefined();
      expect((monday ?? '').trimEnd()).toMatch(/(· ){5}·$/);
    });
  });

  it('shades a studied day differently from an empty one', async () => {
    const grid = buildHeatmap(new Map([['2026-08-21', 25]]), { now: NOW, weeks: 2 });
    await withRender(<Heatmap grid={grid} theme={THEME} />, ({ frame }) => {
      expect(frame()).toContain('█');
      expect(frame()).toContain('·');
    });
  });

  it('states what a full cell means, so the ramp is not guesswork', async () => {
    await withRender(<HeatmapLegend theme={THEME} goal={20} />, ({ frame }) => {
      expect(frame()).toContain('less');
      expect(frame()).toContain('more');
      expect(frame()).toContain('20 cards/day');
    });
  });
});

describe('StackedBar', () => {
  it('says so plainly when there is nothing to chart', async () => {
    await withRender(<StackedBar segments={[]} theme={THEME} />, ({ frame }) => {
      expect(frame()).toContain('Nothing to chart yet');
    });
  });

  it('draws a bar of exactly the requested width', async () => {
    await withRender(
      <StackedBar
        segments={[
          { label: 'verbs', value: 2 },
          { label: 'nouns', value: 1 }
        ]}
        theme={THEME}
        width={30}
        showLegend={false}
      />,
      ({ frame }) => {
        expect(frame().split('\n')[0].trimEnd()).toHaveLength(30);
      }
    );
  });

  it('labels each segment with its count and share', async () => {
    await withRender(
      <StackedBar
        segments={[
          { label: 'verbs', value: 3 },
          { label: 'nouns', value: 1 }
        ]}
        theme={THEME}
        width={20}
      />,
      ({ frame }) => {
        expect(frame()).toContain('verbs');
        expect(frame()).toContain('75%');
        expect(frame()).toContain('nouns');
        expect(frame()).toContain('25%');
      }
    );
  });
});

describe('Analytics', () => {
  it('opens on the activity pane', async () => {
    await withRender(
      inStore(seededStore(), <Analytics onBack={vi.fn()} onQuit={vi.fn()} />),
      ({ frame }) => {
        expect(frame()).toContain('Analytics & history');
        expect(frame()).toContain('Activity');
        expect(frame()).toContain('Mon');
      }
    );
  });

  it('cycles panes with the arrow keys', async () => {
    await withRender(
      inStore(seededStore(), <Analytics onBack={vi.fn()} onQuit={vi.fn()} />),
      async ({ frame, press }) => {
        await press('l');
        expect(frame()).toContain('completed session');
        await press('l');
        expect(frame()).toContain('How the deck splits across tags');
        expect(frame()).toContain('verbs');
        // Wraps back round rather than dead-ending.
        await press('l');
        expect(frame()).toContain('Mon');
        await press('h');
        expect(frame()).toContain('How the deck splits across tags');
      }
    );
  });

  it('ends its footer with the standard navigation tail', async () => {
    await withRender(
      inStore(seededStore(), <Analytics onBack={vi.fn()} onQuit={vi.fn()} />),
      ({ frame }) => {
        const output = frame();
        expect(output).toContain('view');
        expect(output).toContain('back');
        expect(output).toContain('help');
        expect(output.indexOf('back')).toBeLessThan(output.indexOf('help'));
      }
    );
  });

  it('tells an empty history apart from a bad one', async () => {
    const store = emptyStore();
    await withRender(
      inStore(store, <Analytics onBack={vi.fn()} onQuit={vi.fn()} />),
      async ({ frame, press }) => {
        await press('l');
        expect(frame()).toContain('No sessions recorded yet');
        await press('l');
        expect(frame()).toContain('No tags yet');
      }
    );
  });

  it('reads day totals off the session log by local calendar day', () => {
    const counts = selectDailyCardCounts(seededStore().getSnapshot());
    expect(counts.get('2026-08-20')).toBe(12);
    expect(counts.get('2026-08-21')).toBe(25);
    expect(counts.get('2026-08-22')).toBe(4);
  });

  it('leaves rest days out of the accuracy trend', () => {
    const trend = selectAccuracyTrend(seededStore().getSnapshot());
    expect(trend.map(day => day.date)).toEqual(['2026-08-20', '2026-08-21', '2026-08-22']);
    expect(trend[0].accuracy).toBeCloseTo((10 / 12) * 100);
    expect(trend[2].accuracy).toBeCloseTo(25);
  });
});
