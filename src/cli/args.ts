export type Command = 'interactive' | 'study' | 'help' | 'version' | 'import' | 'export';

export interface ParsedArgs {
  command: Command;
  /** File to read or write, for import and export. */
  file?: string;
  /** 1-based column or field for the question, as the user typed it. */
  front?: number;
  back?: number;
  /** Extra tag applied to everything imported. */
  tag?: string;
  /** Report what would happen and write nothing. */
  dryRun: boolean;
  unknown: string[];
}

/**
 * Read the value belonging to an option.
 *
 * A value that is missing or starts with a dash is refused rather than
 * consumed: `--front --dry-run` used to swallow the flag that followed, so the
 * dry run silently did not happen and the import wrote for real.
 */
function optionValue(argv: readonly string[], index: number): string | undefined {
  const value = argv[index];
  return value === undefined || value.startsWith('-') ? undefined : value;
}

/**
 * Parse the command line.
 *
 * Subcommands rather than more flags, because `import` and `export` take a file
 * and do something once and exit — they are a different mode of operation from
 * the interactive session, not a variation on it.
 */
export function parseArgs(argv: readonly string[]): ParsedArgs {
  const unknown: string[] = [];
  const result: ParsedArgs = { command: 'interactive', dryRun: false, unknown };

  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];

    switch (arg) {
      case '--help':
      case '-h':
        return { ...result, command: 'help', unknown: [] };
      case '--version':
      case '-v':
        return { ...result, command: 'version', unknown: [] };
      case '--study':
      case '-s':
        result.command = 'study';
        continue;
      case '--dry-run':
        result.dryRun = true;
        continue;
      case 'import':
      case 'export':
        // Only as the first word, so a deck named "export.csv" cannot change
        // what the command does.
        if (index === 0) {
          result.command = arg;
          continue;
        }
        break;
      case '--front':
      case '--back': {
        const value = optionValue(argv, index + 1);
        const column = Number.parseInt(value ?? '', 10);
        // Reported rather than ignored: silently falling back would import the
        // wrong field because of one typo, and nothing would say so.
        if (value === undefined || !Number.isFinite(column) || column < 1) {
          unknown.push(`${arg} needs a column number from 1`);
        } else if (arg === '--front') {
          result.front = column;
        } else {
          result.back = column;
        }
        if (value !== undefined) {
          index++;
        }
        continue;
      }
      case '--tag': {
        const value = optionValue(argv, index + 1);
        if (value === undefined) {
          unknown.push('--tag needs a name');
        } else {
          result.tag = value;
          index++;
        }
        continue;
      }
      default:
        break;
    }

    if (arg.startsWith('-')) {
      unknown.push(arg);
      continue;
    }
    // The first bare word after a subcommand is the file.
    if (result.file === undefined && result.command !== 'interactive') {
      result.file = arg;
      continue;
    }
    unknown.push(arg);
  }

  return result;
}

export function helpText(version: string): string {
  return `
Terminal Anki v${version} - flashcards with spaced repetition, in your terminal

Usage:
  anki                       Start interactive mode
  anki --study, -s           Start directly in study mode
  anki import <file>         Import an Anki deck (.apkg) or text file (.csv/.txt)
  anki export <file>         Export your cards as an Anki-compatible text file
  anki --version, -v         Print the version
  anki --help, -h            Show this help message

Import options:
  --front <n>                1-based field holding the question (default 1)
  --back <n>                 1-based field holding the answer (default 2)
  --tag <name>               Tag every imported card
  --dry-run                  Report what would happen without writing

Keys:
  Two keystrokes per card: space reveals the answer, then 1-5 grades it
  (Again / Hard / Good / Easy / Perfect). u undoes the last grade.
  q or esc leaves whatever you are in; ? shows every key on the screen.

Environment:
  TERMINAL_ANKI_DATA_DIR     Directory for flashcards.json and config.json
  XDG_DATA_HOME              Used when the override is unset

Data:
  flashcards.json   Cards, session history, streaks, achievements
  config.json       Theme, daily goal, session defaults
`;
}
