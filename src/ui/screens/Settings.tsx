import { useRef, useState } from 'react';
import { Box, Text } from 'ink';
import { Layout } from '../components/Layout.js';
import { screenControls, type Control } from '../controls.js';
import { useHelp } from '../hooks/useHelp.js';
import { useScreenInput } from '../hooks/useScreenInput.js';
import { ThemeContext, useTheme } from '../hooks/useTheme.js';
import { useConfig, useConfigUpdate } from '../hooks/useConfig.js';
import { THEMES, THEME_IDS, type ThemeId } from '../theme/palette.js';
import {
  IMAGE_MODES,
  LIMITS,
  SESSION_LENGTHS,
  clamp,
  withConfig,
  type AppConfig
} from '../../config/schema.js';
import { describeSupport, resolveImageSupport } from '../images/detect.js';
import { useImages } from '../hooks/useImages.js';
import { plural } from '../format.js';

const FIELDS = [
  'theme',
  'images',
  'dailyGoal',
  'heatmapWeeks',
  'defaultSessionLength',
  'shuffle'
] as const;
type Field = (typeof FIELDS)[number];

const LABELS: Record<Field, string> = {
  theme: 'Theme',
  images: 'Images',
  dailyGoal: 'Daily goal',
  heatmapWeeks: 'History span',
  defaultSessionLength: 'Session size',
  shuffle: 'Card order'
};

const HINTS: Record<Field, string> = {
  theme: 'Colours for every screen — previewed as you change it',
  images: 'How pictures on a card are drawn. Takes effect on the next start',
  dailyGoal: 'Cards in a day that fills a square on the activity grid',
  heatmapWeeks: 'How far back the activity grid reaches',
  defaultSessionLength: 'Offered first when you start studying',
  shuffle: 'Whether a session takes its cards in order or shuffled'
};

const SETTINGS_CONTROLS: Control[] = screenControls([
  { key: '↑↓/jk', label: 'field', description: 'Move between settings' },
  { key: '←→/hl', label: 'change', description: 'Change the highlighted setting' },
  { key: '⏎', label: 'save', description: 'Save these settings and go back' }
]);

export interface SettingsProps {
  onBack: () => void;
}

/**
 * Change how the application looks and what it defaults to.
 *
 * Edits are staged and only written on save, so backing out with `q` or Escape
 * leaves the stored settings exactly as they were. The theme is the exception
 * worth calling out: the staged value is pushed into `ThemeContext` for this
 * subtree, so the real header, footer and rows repaint as you cycle through —
 * a preview built from mock components would only ever prove that the mock
 * looks right. Leaving without saving drops the override with the subtree.
 */
const IMAGE_LABELS: Record<(typeof IMAGE_MODES)[number], string> = {
  auto: 'automatic',
  kitty: 'kitty protocol',
  external: 'coloured blocks',
  off: 'filenames only'
};

export function Settings({ onBack }: SettingsProps) {
  const saved = useConfig();
  const images = useImages();
  const update = useConfigUpdate();
  const { isHelpOpen, toggleHelp } = useHelp();

  const [draft, setDraft] = useState<AppConfig>(saved);
  const [fieldIndex, setFieldIndex] = useState(0);

  // Ink delivers a fast "jj" or "ll" as one chunk, so both the row and the
  // staged values have to be stepped from what the previous keystroke left
  // rather than from the render closure.
  const pending = useRef({ draft: saved, fieldIndex: 0 });

  const field = FIELDS[fieldIndex];
  const isDirty = FIELDS.some(name => draft[name] !== saved[name]);

  const commit = (next: AppConfig): void => {
    pending.current.draft = next;
    setDraft(next);
  };

  const move = (delta: number): void => {
    pending.current.fieldIndex =
      (pending.current.fieldIndex + delta + FIELDS.length) % FIELDS.length;
    setFieldIndex(pending.current.fieldIndex);
  };

  const cycle = (delta: number): void => {
    const current = pending.current.draft;
    switch (FIELDS[pending.current.fieldIndex]) {
      case 'theme': {
        const at = THEME_IDS.indexOf(current.theme);
        const next = THEME_IDS[(at + delta + THEME_IDS.length) % THEME_IDS.length];
        commit(withConfig(current, { theme: next }));
        break;
      }
      case 'dailyGoal':
        commit(
          withConfig(current, {
            dailyGoal: clamp(
              current.dailyGoal + delta * LIMITS.dailyGoal.step,
              LIMITS.dailyGoal.min,
              LIMITS.dailyGoal.max
            )
          })
        );
        break;
      case 'heatmapWeeks':
        commit(
          withConfig(current, {
            heatmapWeeks: clamp(
              current.heatmapWeeks + delta * LIMITS.heatmapWeeks.step,
              LIMITS.heatmapWeeks.min,
              LIMITS.heatmapWeeks.max
            )
          })
        );
        break;
      case 'defaultSessionLength': {
        const at = SESSION_LENGTHS.indexOf(current.defaultSessionLength);
        const next =
          SESSION_LENGTHS[
            ((at < 0 ? 0 : at) + delta + SESSION_LENGTHS.length) % SESSION_LENGTHS.length
          ];
        commit(withConfig(current, { defaultSessionLength: next }));
        break;
      }
      case 'images': {
        const at = IMAGE_MODES.indexOf(current.images);
        const next = IMAGE_MODES[(at + delta + IMAGE_MODES.length) % IMAGE_MODES.length];
        commit(withConfig(current, { images: next }));
        break;
      }
      case 'shuffle':
        commit(withConfig(current, { shuffle: !current.shuffle }));
        break;
    }
  };

  useScreenInput({
    isHelpOpen,
    toggleHelp,
    // Escape and q discard: nothing has been written yet.
    onBack,
    onKey: (stroke, key) => {
      if (key.return) {
        update(pending.current.draft);
        onBack();
        return true;
      }
      if (key.upArrow || stroke === 'k') {
        move(-1);
      } else if (key.downArrow || stroke === 'j') {
        move(1);
      } else if (key.leftArrow || stroke === 'h') {
        cycle(-1);
      } else if (key.rightArrow || stroke === 'l') {
        cycle(1);
      }
      return false;
    }
  });

  // What the chosen mode would actually amount to here, so "automatic" is not
  // a mystery and picking a mode this terminal cannot do says so immediately.
  const imageOutcome = describeSupport(
    resolveImageSupport(draft.images, { hasExternalTool: Boolean(images.renderer) })
  );

  const values: Record<Field, string> = {
    theme: THEMES[draft.theme].label,
    images: `${IMAGE_LABELS[draft.images]} · ${imageOutcome}`,
    dailyGoal: `${plural(draft.dailyGoal, 'card')} a day`,
    heatmapWeeks: plural(draft.heatmapWeeks, 'week'),
    defaultSessionLength:
      draft.defaultSessionLength === null ? 'all due cards' : `${draft.defaultSessionLength} cards`,
    shuffle: draft.shuffle ? 'shuffled' : 'as listed'
  };

  return (
    <ThemeContext.Provider value={draft.theme}>
      <SettingsBody
        field={field}
        values={values}
        isDirty={isDirty}
        isHelpOpen={isHelpOpen}
        themeId={draft.theme}
      />
    </ThemeContext.Provider>
  );
}

interface SettingsBodyProps {
  field: Field;
  values: Record<Field, string>;
  isDirty: boolean;
  isHelpOpen: boolean;
  themeId: ThemeId;
}

/**
 * Split out so it renders *inside* the staged ThemeContext.
 *
 * `useTheme` in the same component that provides the context would still read
 * the value from above it, and the preview would silently do nothing.
 */
function SettingsBody({ field, values, isDirty, isHelpOpen, themeId }: SettingsBodyProps) {
  const theme = useTheme();

  return (
    <Layout
      title="⚙ Settings"
      status={isDirty ? 'unsaved — ⏎ to save, q to discard' : 'saved'}
      controls={SETTINGS_CONTROLS}
      isHelpOpen={isHelpOpen}
    >
      <Box flexDirection="column">
        {FIELDS.map(name => {
          const isActive = name === field;
          return (
            <Box key={name}>
              <Text color={isActive ? theme.primary : theme.muted}>{isActive ? '❯ ' : '  '}</Text>
              <Text color={isActive ? theme.primary : theme.muted}>
                {`${LABELS[name]}:`.padEnd(16)}
              </Text>
              {/* Affordances only on the active row, with the space reserved
                  either way so moving the cursor never shifts the layout. */}
              <Text color={isActive ? theme.text : theme.muted} bold={isActive}>
                {isActive ? '◀ ' : '  '}
                {values[name].padEnd(16)}
                {isActive ? '▶' : ' '}
              </Text>
            </Box>
          );
        })}

        <Box flexDirection="column" marginTop={1}>
          <Text color={theme.muted}>{HINTS[field]}</Text>
          <Box marginTop={1}>
            <Text color={theme.muted}>{`${themeId}: `}</Text>
            <Text color={theme.primary}>■ </Text>
            <Text color={theme.secondary}>■ </Text>
            <Text color={theme.success}>■ </Text>
            <Text color={theme.warning}>■ </Text>
            <Text color={theme.error}>■ </Text>
            {theme.heat.map((color, level) => (
              <Text key={level} color={color}>
                █
              </Text>
            ))}
          </Box>
        </Box>
      </Box>
    </Layout>
  );
}
