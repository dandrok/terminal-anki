/**
 * Working out whether this terminal can show a picture.
 *
 * Detection is by environment rather than by asking the terminal, because
 * asking means writing a query and reading the reply off stdin — which Ink is
 * holding open for keystrokes. A reply arriving mid-session would be delivered
 * to the study loop as a burst of nonsense keys.
 *
 * The cost of guessing by environment is that it is sometimes wrong, which is
 * why the setting exists to override it.
 */

/** How images should be drawn, before the environment gets a say. */
export type ImageMode = 'auto' | 'kitty' | 'external' | 'off';

/** What was actually decided. */
export type ImageSupport = 'kitty' | 'external' | 'none';

export interface DetectOptions {
  env?: NodeJS.ProcessEnv;
  /** Whether a helper like `chafa` is on PATH. Injected so this stays pure. */
  hasExternalTool?: boolean;
}

/**
 * Terminals that speak kitty's graphics protocol *with unicode placeholders*.
 *
 * A narrower set than "supports the graphics protocol": placeholders came
 * later, and a terminal with the protocol but not placeholders would draw the
 * image at the cursor and leave it floating over the frame.
 */
function isKittyCapable(env: NodeJS.ProcessEnv): boolean {
  const term = env.TERM ?? '';
  const program = (env.TERM_PROGRAM ?? '').toLowerCase();

  if (env.KITTY_WINDOW_ID || term === 'xterm-kitty') {
    return true;
  }
  if (term === 'xterm-ghostty' || program === 'ghostty' || env.GHOSTTY_RESOURCES_DIR) {
    return true;
  }
  return program === 'wezterm' || Boolean(env.WEZTERM_EXECUTABLE);
}

/**
 * Whether output is going through a multiplexer.
 *
 * tmux only forwards graphics escapes with `allow-passthrough on`, and screen
 * not at all. Guessing wrong here paints escape sequences across the frame as
 * literal text, which is far worse than showing a filename, so a multiplexer
 * turns the protocol off unless the setting insists.
 */
export function isMultiplexed(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.TMUX) || (env.TERM ?? '').startsWith('screen');
}

export function detectImageSupport(options: DetectOptions = {}): ImageSupport {
  const { env = process.env, hasExternalTool = false } = options;

  if (isKittyCapable(env) && !isMultiplexed(env)) {
    return 'kitty';
  }
  return hasExternalTool ? 'external' : 'none';
}

/**
 * Resolve the setting against what the terminal can actually do.
 *
 * An explicit choice is honoured even when detection disagrees — including
 * through tmux, where somebody who has turned passthrough on knows better than
 * this does.
 */
export function resolveImageSupport(mode: ImageMode, options: DetectOptions = {}): ImageSupport {
  switch (mode) {
    case 'off':
      return 'none';
    case 'kitty':
      return 'kitty';
    case 'external':
      return (options.hasExternalTool ?? false) ? 'external' : 'none';
    case 'auto':
      return detectImageSupport(options);
  }
}

/** A short phrase for the settings screen, explaining what auto chose. */
export function describeSupport(
  support: ImageSupport,
  env: NodeJS.ProcessEnv = process.env
): string {
  switch (support) {
    case 'kitty':
      return 'full resolution';
    case 'external':
      return 'coloured blocks';
    case 'none':
      return isMultiplexed(env) ? 'filenames only (tmux)' : 'filenames only';
  }
}
