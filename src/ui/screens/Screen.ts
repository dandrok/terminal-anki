/** Every screen the router can show. */
export type Screen =
  | 'menu'
  | 'study'
  | 'custom-study'
  | 'add'
  | 'browse'
  | 'search'
  | 'delete'
  | 'achievements'
  | 'analytics'
  | 'stats'
  | 'exit';

/** Screens still served by the pre-Ink flow during the phased rewrite. */
export const LEGACY_SCREENS: readonly Screen[] = [
  'study',
  'custom-study',
  'add',
  'browse',
  'search',
  'delete'
];

export function isLegacyScreen(screen: Screen): boolean {
  return LEGACY_SCREENS.includes(screen);
}
