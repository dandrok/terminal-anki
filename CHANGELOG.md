# Changelog

## Unreleased

### Import a deck from AnkiWeb

`anki import deck.apkg` reads Anki packages directly — both the modern zstd format every
current deck uses and the older one — with **no new dependencies**. Node's built-in `sqlite`
reads the collection and `zlib` handles the zip and the zstd.

- **Scheduling comes across.** A deck you have already studied arrives with its intervals,
  ease factors and review counts intact rather than resetting to new. Cards still in learning
  arrive as new, since their interval is in seconds and means nothing here.
- **Deck names become tags, per card.** A package holds a deck tree, so tagging every note
  with one name would label cards that were nowhere near it. The "Default" deck is ignored.
- **Images are stored** under `media/` in your data directory, named by a hash of their
  contents so two decks shipping a different `heart.png` cannot overwrite each other. Cards
  show `[image: …]` where the picture belongs until terminal image support lands.
- Re-importing is idempotent across formats: the same deck as `.apkg` and `.csv`, or as legacy
  and modern packages, updates rather than duplicates.

Note types are never parsed, which is why this is small: field values come from the note, cloze
is visible in the text, and a reverse card is a count over the note's cards.

### Import and export

`anki import deck.csv` and `anki export deck.csv`, using **Anki's own tab-separated text
format** so one file works in both applications with no converter in between.

Import reads the `#separator`, `#html`, `#tags column` and `#guid column` headers Anki writes,
converts HTML fields to plain text — Anki's editor writes `<div>` per line, so without this a
real deck imports as tag soup — and prints the first few cards so a wrong column mapping is
obvious before thousands of them land in your collection.

- `--dry-run` reports exactly what would happen and writes nothing, running the same code path
  as a real import.
- `--front` / `--back` override the columns, `--tag` labels everything it brings in.
- Re-importing does not duplicate. A deck with Anki's note GUIDs is matched on those, so an
  updated deck refreshes cards you are already studying **while keeping their scheduling**.
  Without GUIDs, cards are matched on question text and left alone.
- A whole import is one undo step, however many cards it brought in.
- Cloze notes, reverse cards and audio are counted and reported rather than silently mangled.

### Also fixed

- **Accented characters imported as raw entities.** `caf&eacute;` and `ni&ntilde;o` came
  through literally, which affected every French, Spanish and German deck — the most shared
  kind there is. The full Latin-1 entity set now decodes.
- **A tag containing a space became two tags** after an export/import round trip, because both
  Anki and our text format separate tags with spaces. Internal whitespace now becomes a hyphen.
  Existing tags with spaces are converted on the next load.
- `<img data-src="placeholder.png" src="real.png">` imported the placeholder.

## 2.0.0

A rewrite of everything above the learning rules. **Your data carries over untouched** — the
file format is unchanged (`"version": 2`), so 1.x collections load exactly as they are, with
their scheduling, session history, streaks and achievements intact.

Requires Node 24 or newer, same as 1.3.0.

### Grading a card takes two keystrokes instead of four

This is the headline. In 1.x, grading meant pressing Enter on a menu to reveal the answer, then
arrowing down to the grade you wanted and pressing Enter again — four keystrokes, and their
positions depended on what was listed, so you had to read the menu every single time.

```text
space            reveal the answer
1 2 3 4 5        Again · Hard · Good · Easy · Perfect
```

Two fixed keystrokes, and the digits never move. Over a 100-card session that is roughly 200
keystrokes instead of 400, with muscle memory that actually transfers.

**The quality values written to disk are identical to 1.x**, so upgrading does not shift a
single one of your intervals. Only the keys you press changed.

### Undo

New, and everywhere it makes sense:

- `u` during a session undoes the last grade and puts the card back in front of you
- `u` in the card browser undoes the last edit or delete

Undo history lives in memory for the run and is not persisted.

### You can finally edit a card

1.x could add and delete cards but never change one. Press `e` in the browser.

### The screen stays put

1.x printed everything with `console.log`, so a session summary scrolled away the moment the
menu redrew. v2 has a persistent frame: header, body, footer. Session summaries stay until you
dismiss them, and the footer carries a live progress bar and running accuracy while you study.

### History worth looking at

The Analytics screen is now three panes you move between with `←→`:

- **Activity** — a GitHub-style contribution heatmap, Monday-first, 15 weeks by default
- **Sessions** — recent sessions with per-session accuracy, and an accuracy sparkline
- **Tags** — how your deck splits across tags, as a stacked bar

Heatmap shade is the ratio to a **daily goal** you set, not to your busiest day — scaling to the
maximum darkens the whole grid after one heavy day, so a steady habit ends up looking like it
fell apart. Day totals are bucketed by your local calendar, not UTC.

To give the grid something to draw, stored session history now keeps **500 records instead of
100**. At three sessions a day, 100 covered barely a month.

### Settings, and four themes

A new Settings screen, and a `config.json` alongside your cards:

| Setting | Default | Affects |
| --- | --- | --- |
| Theme | Default | Every screen. Also Forest, Monochrome, Dracula. |
| Daily goal | 20 cards | What fills a square on the activity grid |
| History span | 15 weeks | How far back the grid reaches |
| Session size | all due | Which row is preselected when you start studying |
| Card order | shuffled | Whether a session shuffles or takes cards in order |

Changes are staged and only written when you press `⏎`; `q` or `esc` discards them. The theme is
previewed on the real frame as you cycle through it, so you see the actual result rather than a
swatch. Themes use your terminal's own colour names, so your colour scheme still applies.

Settings live in a separate file from your cards on purpose: a settings file mangled by hand
must never be able to take your collection down with it. Out-of-range values are clamped rather
than rejected, and an unreadable `config.json` is moved aside and replaced with defaults — while
an unreadable `flashcards.json` is still never overwritten.

### One navigation scheme, everywhere

In 1.x, `q` variously quit the application, went back a screen, and ended a session. Now there
is exactly one rule:

**`q` and `esc` leave whatever you are currently in.** On a sub-screen that means going back a
step; on the menu, which is the outermost thing, it means quitting. Ctrl+C quits from anywhere
and saves on the way out.

Every screen ends its footer with the same entries, and `?` shows what every key on the current
screen does. The one exception is announced rather than hidden: while you are typing into a
field, `q` and `?` are characters, so those footers show `[esc] back` alone instead of naming
keys that would do something else.

Elsewhere: `↑↓` or `j k` to move, `←→` or `h l` to change a value, `/` to filter a list as you
type.

### Menu changes

"List all cards" and "Delete card" are gone as separate entries — both live in **Browse cards**
now, along with editing, filtering and undo. Deleting asks for confirmation first, and is
undoable. **Settings** is new.

### Fixes

- **Average session length was overstated.** It divided the minutes from *all* sessions by the
  count of *completed* ones, so quitting sessions early inflated the figure.
- **Sessions no longer end when you press `q`.** It ends the session and shows you the summary,
  which is what you wanted; Ctrl+C still quits outright.
- **Far fewer disk writes.** 1.x rewrote the entire data file on every single grade — at ~1KB per
  card, a 100-card session over a 5,000-card deck meant around 500MB of writes for 100 logical
  updates. Grades are now batched and flushed after 1s idle. Anything structural — adding,
  editing or deleting a card, ending a session, undo, quitting, Ctrl+C — is still written
  through immediately. **The trade-off, stated plainly:** a hard kill or power loss can lose up
  to about 1s of grading, realistically one or two cards' scheduling.

### Breaking changes

Only two things a user can notice, and one for anyone importing the package:

1. **Grading keys moved** from the raw SM-2 values on a menu to Anki's `1`–`5`. Your stored
   intervals are untouched.
2. **`q` no longer quits from inside a session** — it ends it and shows the summary.
3. **Library API:** `FlashcardManager` and `FlashcardRepository` are gone; use `createStore` and
   `createRepository`. `sm2.reviewCard()` was removed — it mutated its argument in place, so use
   the pure `sm2.schedule()`. The `sm2`, `filters`, `stats`, `streaks` and `achievements`
   namespace exports are unchanged.

### Under the hood

Built on **Ink 7 and React 19**. There are no classes anywhere in the codebase — the three that
existed were replaced by closure factories over a pure reducer and an external store.
`@clack/prompts`, `chalk` and `ora` are gone; the runtime dependencies are now `ink` and `react`.

584 tests, ~96% statement coverage on the non-presentational code, with the layering, the absence
of classes and the absence of import cycles all enforced by a test rather than by convention.

`--help` and `--version` still return in about 50ms because they never load the renderer — a test
walks the import graph to keep it that way. The interactive launch reaches its first frame in
roughly 730ms, of which about 450ms is loading Ink itself.

### Upgrading

Nothing to do. Install and run.

```bash
npm install -g terminal-anki
anki
```

If you are coming from **1.2.0 or earlier**, those versions stored data inside the installed
package directory, where a global `npm update` would wipe it. The first run copies that file to
its proper location automatically and leaves the original in place as a safety net.

---

## 1.3.0

Fixed a set of correctness bugs, moved data out of the package directory, and added CI.

- **Card IDs could collide.** IDs were derived from the card count, so deleting a card and adding
  another could produce an ID that already existed. Now `crypto.randomUUID()`.
- **Study dates were recorded a day early** anywhere east of Greenwich, because dates were
  formatted through UTC. Streaks were affected. Now formatted from the local calendar.
- **A data file that could not be parsed was overwritten** with sample cards, destroying the
  collection on a single bad parse. It is now copied aside as
  `flashcards.json.corrupt-<timestamp>.bak` and never overwritten.
- **Data moved out of the install directory** to `$XDG_DATA_HOME/terminal-anki` (or
  `~/.terminal-anki`), with `TERMINAL_ANKI_DATA_DIR` to override. Existing data is migrated on
  first run.
- Writes are atomic.
- Custom study honours the due-cards scope, instead of quietly studying the whole deck.
- Full TypeScript, ESLint and Prettier, a Vitest suite, pre-commit and pre-push hooks, GitHub
  Actions CI, and npm publishing via trusted publishing (OIDC).
