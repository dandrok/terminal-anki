import type { ReactNode } from 'react';
import { MainMenu } from './screens/MainMenu.js';
import { QuickStats } from './screens/QuickStats.js';
import { Achievements } from './screens/Achievements.js';
import { Analytics } from './screens/Analytics.js';
import type { Screen } from './screens/Screen.js';

export interface RouterProps {
  screen: Screen;
  onNavigate: (screen: Screen) => void;
}

/**
 * Screen table.
 *
 * A `Record<Screen, ...>` rather than a switch, so adding a screen to the union
 * without routing it is a compile error. Values are thunks so only the active
 * screen's element is constructed. `onBack` targets are decided here, keeping
 * screens ignorant of the navigation graph.
 */
export function Router({ screen, onNavigate }: RouterProps): ReactNode {
  const toMenu = () => onNavigate('menu');

  const screens: Record<Screen, () => ReactNode> = {
    menu: () => <MainMenu onSelect={onNavigate} />,
    stats: () => <QuickStats onBack={toMenu} />,
    achievements: () => <Achievements onBack={toMenu} />,
    analytics: () => <Analytics onBack={toMenu} />,

    // Handed to the pre-Ink flow by App; never rendered.
    study: () => null,
    'custom-study': () => null,
    add: () => null,
    browse: () => null,
    search: () => null,
    delete: () => null,
    exit: () => null
  };

  return screens[screen]();
}
