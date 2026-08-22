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
Terminal Anki v${version} - Enhanced Flashcard Learning System

Usage:
  anki                  Start interactive mode
  anki --study, -s      Start directly in study mode
  anki --version, -v    Print the version
  anki --help, -h       Show this help message

Environment:
  TERMINAL_ANKI_DATA_DIR   Override where flashcards.json is stored
  XDG_DATA_HOME            Used when the override is unset

Features:
  ◎ Custom study sessions (by tags, difficulty, due state, limits)
  ◈ Tag system for flashcards
  ◈ Learning streaks tracking
  ◑ Achievement system
  ◰ Enhanced analytics dashboard
  ◴ Study session history
  ◎ Spaced repetition learning (SM-2 algorithm)
  ◈ Local data storage with full history
`;
}
