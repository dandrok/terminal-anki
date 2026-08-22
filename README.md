# Terminal Anki

Flashcards with spaced repetition, in your terminal. Two keystrokes per card.

![Node](https://img.shields.io/badge/node-%3E%3D24-339933?style=flat-square)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-007ACC?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

```bash
npm install -g terminal-anki
anki
```

---

## What v2 changes

v2 is a rewrite of everything above the learning rules. **Your data carries over untouched** —
the file format is unchanged and 1.x collections load as they are.

|                  | 1.x                                  | 2.0                                               |
| ---------------- | ------------------------------------ | ------------------------------------------------- |
| Grading a card   | 4 keystrokes, positions move         | **2 fixed keystrokes**                            |
| Screen           | `console.log`, summaries scroll away | Persistent frame that stays put                   |
| Editing a card   | not possible                         | `e` in the browser                                |
| Undo             | none                                 | `u` — grades, edits and deletes                   |
| History          | a list of numbers                    | Activity heatmap, per-day accuracy, tag breakdown |
| Themes           | none                                 | Four, previewed live before you commit            |
| Writes per grade | full file rewrite, every time        | Batched; ~1s exposure on a hard kill              |

Under the hood: Ink 7 and React 19, no classes anywhere, `core/` is pure and framework-free,
584 tests. See [Upgrading from 1.x](#upgrading-from-1x) for the two behaviour changes worth knowing.

---

## Keys

The whole point of v2. Grading is two fixed keystrokes and the digits never move, unlike a
menu whose positions depend on what happens to be listed.

```text
space            reveal the answer
1 2 3 4 5        Again · Hard · Good · Easy · Perfect
u                undo the last grade
s                skip without grading
```

Everywhere else:

```text
↑↓ or j k        move
←→ or h l        change the highlighted value
⏎                select / confirm / save
?                what does every key on this screen do
q or esc         leave whatever you are in
```

There is exactly one navigation rule: **`q` and `esc` leave whatever you are currently in.**
On a sub-screen that means going back a step; on the menu, which is the outermost thing, it
means quitting. Ctrl+C quits from anywhere and flushes on the way out.

Every screen ends its footer with the same two entries, so moving between screens never moves
the navigation keys. The one exception is announced rather than hidden: while a text field has
focus, `q` and `?` type characters, so those footers show `[esc] back` alone instead of naming
keys that do something else.

---

## Screens

| Screen           | What it is for                                                                                    |
| ---------------- | ------------------------------------------------------------------------------------------------- |
| **Study**        | The core loop. Progress bar and running accuracy in the footer.                                   |
| **Custom study** | Filter by scope, tags, difficulty, count and order before you start.                              |
| **Browse**       | Cards with due state and difficulty. `/` filters as you type, `e` edits, `d` deletes, `u` undoes. |
| **Add / Edit**   | Front, back and tags. `^s` saves from any field.                                                  |
| **Achievements** | Eight of them, with progress on the locked ones.                                                  |
| **Analytics**    | Three panes on `←→`: activity heatmap, session history, tag breakdown.                            |
| **Quick stats**  | Counts, due today, and the new/learning/young/mature split.                                       |
| **Settings**     | Theme, daily goal, history span, session size, card order.                                        |

### The activity grid

A GitHub-style contribution grid, Monday-first, ending with the current week.

```text
     May   Jun       Jul     Aug
 Mon · · · · · · █ ▒ · ▓ █ · ▓ █ ·
     · · · · · █ ░ · ▓ █ · █ ▓ · ▒
 Wed · · · · · ░ · ▓ █ · █ ▓ · ▒ █
     · · · · · · ▓ █ · █ ▓ · ░ █ ·
 Fri · · · · · ▒ ▓ · █ ▓ · ░ █ · █
     · · · · · ▓ · █ ▒ · █ █ · █ ░
 Sun · · · · █ · █ ▒ · █ █ · ▓ █

 less · ░ ▒ ▓ █ more · full cell = 20 cards/day
```

Shade is the ratio to your **daily goal**, not to your busiest day. Scaling to the maximum
darkens the whole grid the moment you have one unusually heavy day, so a steady habit ends up
looking like it fell apart. The glyph ramp doubles the colour ramp, so the grid still reads
with colour off. Day totals are bucketed by your **local** calendar, not UTC.

---

## Settings

`anki` → **Settings**. Changes are staged and only written when you press `⏎`; `q` or `esc`
discards them. The theme is previewed on the real frame as you cycle through — header, footer
and rows all recolour, so you are looking at the actual result rather than a swatch.

| Setting      | Default       | What it affects                                         |
| ------------ | ------------- | ------------------------------------------------------- |
| Theme        | Default       | Every screen. Also: Forest, Monochrome, Dracula.        |
| Daily goal   | 20 cards      | What fills a square on the activity grid.               |
| History span | 15 weeks      | How far back the grid reaches.                          |
| Session size | all due cards | Which row is preselected when you start studying.       |
| Card order   | shuffled      | Whether a session takes its cards in order or shuffled. |

Themes use Ink colour **names**, not hex, so your terminal's own colour scheme still applies.

---

## CLI

```bash
anki              # interactive
anki --study      # jump straight into due cards
anki --version
anki --help
```

`--help` and `--version` never load Ink or React — they return in about **50ms**, and a test
walks the static import graph to keep it that way. The interactive launch reaches its first
frame in roughly **730ms**, of which about 450ms is `import('ink')` alone; the project's own 74
modules account for around 45ms of it. That is why this ships as plain `tsc` output rather than
a bundle — bundling would be optimising the 6% of startup that is ours.

---

## Your data

Two files, in one directory:

| File              | Holds                                         |
| ----------------- | --------------------------------------------- |
| `flashcards.json` | Cards, session history, streaks, achievements |
| `config.json`     | Theme, daily goal, session defaults           |

Separate on purpose: they have different write cadence and different blast radius. A settings
file mangled by hand must never be able to take the collection down with it.

The directory is resolved in this order:

| Location                       | When                                     |
| ------------------------------ | ---------------------------------------- |
| `$TERMINAL_ANKI_DATA_DIR`      | Whenever the variable is set             |
| `$XDG_DATA_HOME/terminal-anki` | When `XDG_DATA_HOME` is an absolute path |
| `~/.terminal-anki`             | Default                                  |

```bash
# Point the app at a different collection
TERMINAL_ANKI_DATA_DIR=~/decks/spanish anki
```

### How writes are handled

Both files are written to a sibling and renamed, so an interrupted write leaves the previous
version intact rather than half a file.

The two files fail differently, on purpose:

- **`flashcards.json` that cannot be parsed** is copied aside as
  `flashcards.json.corrupt-<timestamp>.bak` and never overwritten. If it cannot even be copied,
  saving is disabled for the run so the file is left completely alone. Your deck may be the
  only copy in existence.
- **`config.json` that cannot be parsed** is moved aside and replaced with defaults. Settings
  are fifteen seconds of work; locking the application into a read-only run over a colour
  scheme would be absurd.

Out-of-range settings are clamped rather than rejected, so a hand-edited file still starts.

### Batched writes

Grades are held in memory and flushed after **1s idle**. Everything structural — adding,
editing or deleting a card, ending a session, undo, quitting, `SIGINT`, `SIGTERM` — is written
through immediately.

**The accepted trade-off, stated plainly:** a hard kill (`SIGKILL`, power loss) can lose up to
about 1s of grading, realistically one or two cards' scheduling. v1 rewrote the entire file on
every single grade, which at ~1KB/card meant a 100-card session over a 5,000-card deck did
around 500MB of writes for 100 logical updates.

---

## Upgrading from 1.x

**Nothing to do.** The schema is unchanged (`"version": 2`), so 1.x collections — cards,
scheduling state, session history, streaks and achievements — load exactly as they are.

Two behaviour changes worth knowing:

1. **Grading keys moved.** v1 used the raw SM-2 quality values on a menu; v2 uses Anki's
   `1`-`5`. The quality values written to disk are identical, so your existing intervals are
   untouched — only the keys you press changed.
2. **`q` no longer quits from inside a session.** It ends the session and shows you the
   summary. Ctrl+C still quits outright.

Session history is now capped at 500 records rather than 100, so the activity grid has
something to draw. Older entries beyond that are dropped as before.

### Coming from 1.2.0 or earlier?

Those versions stored data inside the installed package directory, where a global `npm update`
would wipe it. The first run copies that file to the proper location automatically and leaves
the original in place as a safety net.

---

## Using it as a library

The learning rules are pure functions and storage is behind a factory, so the package can be
driven programmatically or pointed at a different backing store.

```typescript
import { createStore, selectors, sm2, filters } from 'terminal-anki';

const store = createStore({ dataFile: '/tmp/deck.json' });

store.dispatch({
  type: 'card/add',
  front: 'TypeScript',
  back: 'A typed superset of JavaScript',
  tags: ['programming'],
  now: new Date()
});

const state = store.getSnapshot();

// Schedule a review without touching disk
const next = sm2.schedule(selectors.selectCards(state)[0], 4);

// Select cards with the same rules the CLI uses
const session = filters.applyFilters(selectors.selectCards(state), {
  dueOnly: true,
  tags: ['programming'],
  limit: 20,
  randomOrder: true
});

store.flush(); // deferred writes are yours to commit
store.dispose();
```

`createStore` returns a plain object — `getSnapshot`, `subscribe`, `dispatch`, `flush`,
`dispose` — which is what the UI subscribes to through `useSyncExternalStore`. There are no
classes in this codebase.

> **Breaking in 2.0:** `FlashcardManager` and `FlashcardRepository` are gone. Use `createStore`
> and `createRepository`. The `sm2`, `filters`, `stats`, `streaks` and `achievements` namespace
> exports are unchanged. `sm2.reviewCard()` was removed — it mutated its argument in place;
> use the pure `sm2.schedule()`.

---

## Development

```bash
git clone https://github.com/dandrok/terminal-anki.git
cd terminal-anki
npm install          # also installs the git hooks
npm run build
npm link             # makes `anki` point at your working copy
```

| Command                 | What it does                                            |
| ----------------------- | ------------------------------------------------------- |
| `npm run dev`           | Run from source with tsx                                |
| `npm run build`         | Compile to `dist/` and restore the bin's executable bit |
| `npm test`              | Vitest, once                                            |
| `npm run test:watch`    | Re-run on change                                        |
| `npm run test:coverage` | With a v8 coverage report                               |
| `npm run check`         | lint + type-check + format:check + test                 |

### Structure

Each layer only depends on the ones below it, so the learning rules can be tested without a
terminal or a filesystem.

```text
src/
├── core/          Pure domain logic — no I/O, no React, no Ink
│   ├── sm2.ts             SM-2 scheduling
│   ├── grading.ts         Key → quality bindings
│   ├── filters.ts         Selection, search, shuffle
│   ├── stats.ts           Card and session statistics
│   ├── rollups.ts         Session log → per-day totals
│   ├── streaks.ts         Consecutive-day rules
│   ├── achievements.ts    Definitions and evaluation
│   ├── dates.ts           Local-calendar helpers
│   └── ids.ts             Card and session ids
├── state/         Reducer, store, selectors, write policy
├── storage/       Paths, serialization, atomic repository, config store
├── config/        Settings schema, defaults and clamping
├── ui/            Ink components, screens, hooks, charts, theme
├── cli/           Argument parsing and the executable entry point
├── types/         Shared type definitions
└── index.ts       Public library exports
```

| Layer      | May import                                               | Must not import      |
| ---------- | -------------------------------------------------------- | -------------------- |
| `core/`    | `types/`                                                 | anything else        |
| `state/`   | `core/`, `storage/`, `types/`                            | `ui/`, `cli/`        |
| `storage/` | `core/`, `config/`, `types/`                             | `ui/`, `cli/`        |
| `config/`  | `types/`, and the theme and chart defaults it configures | `state/`, `storage/` |
| `ui/`      | everything except `cli/`                                 | `cli/`               |
| `cli/`     | everything                                               | —                    |

`core/` imports nothing from this project but itself and `types/`, and never touches the
filesystem. If one of its test files ever needs editing during a UI change, something has leaked
into the pure layer. `tests/architecture.test.ts` enforces the whole table, plus "no classes"
and "no import cycles".

### Testing

584 tests, ~96% statement coverage on the non-presentational code.

- **Pure functions** — `core/`, `config/` and `ui/charts/` are tested directly.
- **The store** is driven with no renderer at all: batching, write-through, undo depth.
- **Screens** are rendered with `ink-testing-library` and driven by keystrokes. Note that
  `press()` must be awaited — `stdin.write` only queues the key, so reading the frame
  synchronously returns the previous render.
- **`tests/ui/footer.test.tsx`** renders every screen and mode and asserts the navigation tail,
  that no key is bound twice, and that every key in the strip is explained in the help overlay.
  A rendering inventory rather than a hand-written list of expected controls, which would drift
  silently.
- **`tests/cli/startup-budget.test.ts`** walks the static import graph and fails if Ink ever
  becomes reachable from `--help`.
- Colour cannot be asserted from a test frame — Ink renders without a TTY there, so chalk
  strips the escape codes. Anything colour-dependent is verified by driving the built CLI
  under a pty instead.

### Hooks and CI

`simple-git-hooks` installs on `npm install`:

| Hook         | Runs                    |
| ------------ | ----------------------- |
| `pre-commit` | `lint` + `format:check` |
| `pre-push`   | `check` + `build`       |

`.github/workflows/ci.yml` runs three jobs on Node 24 — `verify` (lint, types, format, tests
with coverage), `build` (compile, smoke-test the CLI, check the packed contents and the bin's
executable bit) and `audit`. Ubuntu only; macOS and Windows are not covered.

Releases are documented in [RELEASING.md](RELEASING.md), and what changed in each one is in
[CHANGELOG.md](CHANGELOG.md).

---

## Credits

The SM-2 algorithm comes from **SuperMemo** (1985); the grading keys and the two-keystroke loop
come from **Anki**.

## License

MIT — see [LICENSE](LICENSE).
