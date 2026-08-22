export interface ParsedArgs {
  command: 'interactive' | 'study' | 'help' | 'version';
  unknown: string[];
}

export function parseArgs(argv: readonly string[]): ParsedArgs {
  const unknown: string[] = [];
  let command: ParsedArgs['command'] = 'interactive';

  for (const arg of argv) {
    switch (arg) {
      case '--help':
      case '-h':
        return { command: 'help', unknown: [] };
      case '--version':
      case '-v':
        return { command: 'version', unknown: [] };
      case '--study':
      case '-s':
        command = 'study';
        break;
      default:
        unknown.push(arg);
    }
  }

  return { command, unknown };
}

export function helpText(version: string): string {
  return `
Terminal Anki v${version} - flashcards with spaced repetition, in your terminal

Usage:
  anki                  Start interactive mode
  anki --study, -s      Start directly in study mode
  anki --version, -v    Print the version
  anki --help, -h       Show this help message

Keys:
  Two keystrokes per card: space reveals the answer, then 1-5 grades it
  (Again / Hard / Good / Easy / Perfect). u undoes the last grade.
  q or esc leaves whatever you are in; ? shows every key on the screen.

Environment:
  TERMINAL_ANKI_DATA_DIR   Directory for flashcards.json and config.json
  XDG_DATA_HOME            Used when the override is unset

Data:
  flashcards.json   Cards, session history, streaks, achievements
  config.json       Theme, daily goal, session defaults
`;
}
