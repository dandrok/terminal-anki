import type { ReactNode } from 'react';
import { MainMenu } from './screens/MainMenu.js';
import { QuickStats } from './screens/QuickStats.js';
import { Achievements } from './screens/Achievements.js';
import { Analytics } from './screens/Analytics.js';
import { Settings } from './screens/Settings.js';
import { StudyFlow } from './screens/StudyFlow.js';
import { Browse } from './screens/Browse.js';
import { CardForm } from './screens/CardForm.js';
import { useDispatch } from './hooks/useStore.js';
import type { Screen } from './screens/Screen.js';
import type { Flashcard } from '../types/index.js';

export interface RouterProps {
  screen: Screen;
  onNavigate: (screen: Screen) => void;
  onQuit: () => void;
  /** The card being edited, when the screen is `edit`. */
  editing?: Flashcard;
  onEdit: (card: Flashcard) => void;
}

/**
 * Screen table.
 *
 * A `Record<Screen, ...>` rather than a switch, so adding a screen to the union
 * without routing it is a compile error. Values are thunks so only the active
 * screen's element is constructed. `onBack` targets are decided here, keeping
 * screens ignorant of the navigation graph.
 */
export function Router({ screen, onNavigate, onQuit, editing, onEdit }: RouterProps): ReactNode {
  const dispatch = useDispatch();
  const toMenu = () => onNavigate('menu');
  const toBrowse = () => onNavigate('browse');

  const screens: Record<Screen, () => ReactNode> = {
    menu: () => <MainMenu onSelect={onNavigate} onQuit={onQuit} />,
    stats: () => <QuickStats onBack={toMenu} onQuit={onQuit} />,
    achievements: () => <Achievements onBack={toMenu} onQuit={onQuit} />,
    analytics: () => <Analytics onBack={toMenu} onQuit={onQuit} />,
    settings: () => <Settings onBack={toMenu} />,
    study: () => <StudyFlow onExit={toMenu} onQuit={onQuit} />,
    'custom-study': () => <StudyFlow onExit={toMenu} onQuit={onQuit} mode="custom" />,

    browse: () => <Browse onBack={toMenu} onEdit={onEdit} />,
    search: () => <Browse onBack={toMenu} onEdit={onEdit} initialQuery="" />,

    add: () => (
      <CardForm
        onCancel={toMenu}
        onSave={draft => {
          dispatch({ type: 'card/add', ...draft, now: new Date() });
          onNavigate('menu');
        }}
      />
    ),

    edit: () => {
      // Nothing to edit means something went wrong upstream; falling back to
      // the list beats rendering a blank screen with no way out of it.
      if (!editing) {
        return <Browse onBack={toMenu} onEdit={onEdit} />;
      }
      return (
        <CardForm
          card={editing}
          onCancel={toBrowse}
          onSave={draft => {
            dispatch({ type: 'card/edit', id: editing.id, ...draft, now: new Date() });
            onNavigate('browse');
          }}
        />
      );
    },

    exit: () => null
  };

  return screens[screen]();
}
