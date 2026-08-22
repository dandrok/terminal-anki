import type { ReactNode } from 'react';
import { MainMenu } from './screens/MainMenu.js';
import { QuickStats } from './screens/QuickStats.js';
import { Achievements } from './screens/Achievements.js';
import { Analytics } from './screens/Analytics.js';
import { StudyFlow } from './screens/StudyFlow.js';
import type { Screen } from './screens/Screen.js';

export interface RouterProps {
  screen: Screen;
  onNavigate: (screen: Screen) => void;
  onQuit: () => void;
}

/**
 * Screen table.
 *
 * A `Record<Screen, ...>` rather than a switch, so adding a screen to the union
 * without routing it is a compile error. Values are thunks so only the active
 * screen's element is constructed. `onBack` targets are decided here, keeping
 * screens ignorant of the navigation graph.
 */
export function Router({ screen, onNavigate, onQuit }: RouterProps): ReactNode {
  const toMenu = () => onNavigate('menu');

  const screens: Record<Screen, () => ReactNode> = {
    menu: () => <MainMenu onSelect={onNavigate} onQuit={onQuit} />,
    stats: () => <QuickStats onBack={toMenu} onQuit={onQuit} />,
    achievements: () => <Achievements onBack={toMenu} onQuit={onQuit} />,
    analytics: () => <Analytics onBack={toMenu} onQuit={onQuit} />,
    study: () => <StudyFlow onExit={toMenu} onQuit={onQuit} />,

    // Handed to the pre-Ink flow by App; never rendered.
    'custom-study': () => null,
    add: () => null,
    browse: () => null,
    search: () => null,
    delete: () => null,
    exit: () => null
  };

  return screens[screen]();
}
