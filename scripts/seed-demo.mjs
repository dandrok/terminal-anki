#!/usr/bin/env node
/**
 * Build a deterministic demo collection for the README recording.
 *
 * Writes `.demo/flashcards.json` and `.demo/config.json`, which is what
 * `TERMINAL_ANKI_DATA_DIR=.demo anki` reads. Everything is relative to today,
 * so the grid has recent activity and the four due cards stay due.
 *
 * The output is gitignored: it is generated, not shipped, and the recorded GIF
 * in `docs/` is the checked-in artifact.
 */
import { mkdir, writeFile } from 'node:fs/promises';

const OUT_DIR = '.demo';
const DAY = 86_400_000;
const NOW = new Date();

/** Local midnight `offset` days from today, at `hour`. */
function at(offset, hour = 9) {
  const date = new Date(NOW.getTime() + offset * DAY);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
}

function hoursAgo(hours) {
  return new Date(NOW.getTime() - hours * 3_600_000).toISOString();
}

// [front, back, tag, interval in days] — four cards are due right now, the rest
// are scheduled ahead so the menu reads like a collection in use.
const SEEDS = [
  ['el libro', 'the book', 'spanish', 0],
  ['la ventana', 'the window', 'spanish', 0],
  ['el tenedor', 'the fork', 'spanish', 0],
  ['la llave', 'the key', 'spanish', 0],
  ['temprano', 'early', 'spanish', 6],
  ['el barrio', 'the neighbourhood', 'spanish', 9],
  ['echar de menos', 'to miss (someone)', 'spanish', 12],
  ['aunque', 'although', 'spanish', 18],
  ['el hueso', 'the bone', 'spanish', 24],
  ['la costumbre', 'the habit', 'spanish', 31],
  ['madrugar', 'to get up early', 'spanish', 40],
  ['el atardecer', 'dusk', 'spanish', 55],

  ['Australia', 'Canberra', 'capitals', 3],
  ['Canada', 'Ottawa', 'capitals', 7],
  ['Brazil', 'Brasília', 'capitals', 11],
  ['Switzerland', 'Bern', 'capitals', 16],
  ['Turkey', 'Ankara', 'capitals', 21],
  ['Morocco', 'Rabat', 'capitals', 27],
  ['Vietnam', 'Hanoi', 'capitals', 33],
  ['Kenya', 'Nairobi', 'capitals', 44],
  ['Peru', 'Lima', 'capitals', 52],
  ['Norway', 'Oslo', 'capitals', 63],
  ['New Zealand', 'Wellington', 'capitals', 71],
  ['Kazakhstan', 'Astana', 'capitals', 90],

  [
    'What does `useMemo` do?',
    'Caches a computed value between renders until a dependency changes',
    'react',
    2
  ],
  ['What is a reducer?', 'A pure function from (state, action) to the next state', 'react', 5],
  [
    'Why do keys matter in a list?',
    'React matches elements between renders by key; a bad key remounts them',
    'react',
    8
  ],
  [
    'What is `useSyncExternalStore` for?',
    'Subscribing a component to an external store without tearing',
    'react',
    13
  ],
  [
    'What does `strict` enable?',
    'Type checking that rejects implicit any, null and undefined surprises',
    'typescript',
    20
  ],
  [
    'What is a discriminated union?',
    'A union of object types sharing a literal field the compiler can narrow on',
    'typescript',
    26
  ],
  [
    'What does `satisfies` do?',
    'Checks a value against a type while keeping its narrower inferred type',
    'typescript',
    34
  ],
  [
    'When is `unknown` better than `any`?',
    'Always — it forces a check before use instead of switching checking off',
    'typescript',
    41
  ],
  [
    'What is a closure?',
    'A function plus the scope it captured where it was defined',
    'javascript',
    49
  ],
  [
    'What does `Array.prototype.at(-1)` return?',
    'The last element, without mutating or copying the array',
    'javascript',
    58
  ],
  [
    'What is the event loop?',
    'The queue that runs callbacks once the current stack is empty',
    'javascript',
    66
  ],
  [
    'What is a microtask?',
    'A promise callback, drained before the next macrotask and before rendering',
    'javascript',
    77
  ],

  ['What is the longest river in Europe?', 'The Volga', 'geography', 4],
  ['Which sea is the saltiest?', 'The Dead Sea', 'geography', 10],
  ['What is the smallest country?', 'Vatican City', 'geography', 15],
  ['Where is the Atacama?', 'Northern Chile', 'geography', 22],
  ['What is a fjord?', 'A deep glacial valley flooded by the sea', 'geography', 29],
  ['Which continent has no rivers?', 'Antarctica', 'geography', 37],
  ['What is the Ring of Fire?', 'The volcanic belt around the Pacific', 'geography', 46],
  ['What is a rain shadow?', 'The dry side of a mountain range', 'geography', 54],
  ['Which lake holds the most fresh water?', 'Lake Baikal', 'geography', 68],
  ['What is an archipelago?', 'A chain of islands', 'geography', 80],
  ['Where does the Danube end?', 'The Black Sea', 'geography', 95],
  ['What is a delta?', 'Sediment laid down where a river meets slower water', 'geography', 120]
];

const cards = SEEDS.map(([front, back, tag, interval], index) => {
  // The first four seeds are the due cards.
  const due = index < 4;
  const reps = due ? 3 + (index % 3) : Math.max(1, Math.round(interval / 6));
  return {
    id: `demo-${String(index + 1).padStart(2, '0')}`,
    front,
    back,
    tags: [tag],
    easiness: 2.3 + ((index * 7) % 9) / 20,
    interval: due ? Math.max(1, index + 1) : interval,
    repetitions: reps,
    nextReview: due ? hoursAgo(index + 1) : at(interval, 9),
    lastReview: due ? at(-(2 + index), 20) : at(-1 - (index % 5), 20),
    createdAt: at(-60 + index, 8)
  };
});

// A small deterministic PRNG, so every recording has the same heatmap.
let state = 20_260_305;
function random() {
  state = (state * 1_103_515_245 + 12_345) % 2_147_483_648;
  return state / 2_147_483_648;
}

const sessionHistory = [];
for (let day = 100; day >= 1; day -= 1) {
  if (random() < 0.42) {
    continue;
  }
  const studied = 8 + Math.floor(random() * 26);
  const correct = studied - Math.floor(random() * 3);
  const start = at(-day, 19);
  sessionHistory.push({
    id: `demo-session-${day}`,
    startTime: start,
    endTime: new Date(new Date(start).getTime() + (4 + random() * 18) * 60_000).toISOString(),
    cardsStudied: studied,
    correctAnswers: correct,
    incorrectAnswers: studied - correct,
    averageDifficulty: 1.4 + random() * 1.6,
    sessionType: 'due',
    quitEarly: false
  });
}

const studyDates = [-4, -3, -2, -1, 0].map(offset => at(offset).slice(0, 10));

const data = {
  version: 2,
  cards,
  sessionHistory,
  learningStreak: {
    currentStreak: 5,
    longestStreak: 14,
    lastStudyDate: at(0),
    studyDates
  },
  // Definitions are rebuilt on load; only the unlock time and the peak progress
  // are read back from here.
  achievements: [
    { id: 'first_card', unlockedAt: at(-60, 8), progress: { current: 1 } },
    { id: 'first_session', unlockedAt: at(-58, 19), progress: { current: 1 } },
    { id: 'streak_3', unlockedAt: at(-6, 19), progress: { current: 3 } },
    { id: 'cards_10', unlockedAt: at(-52, 8), progress: { current: 10 } },
    { id: 'sessions_10', unlockedAt: at(-35, 19), progress: { current: 10 } },
    { id: 'reviews_100', unlockedAt: at(-20, 19), progress: { current: 100 } }
  ]
};

const config = {
  version: 1,
  theme: 'dracula',
  dailyGoal: 20,
  heatmapWeeks: 15,
  defaultSessionLength: null,
  shuffle: true,
  images: 'auto'
};

await mkdir(OUT_DIR, { recursive: true });
await Promise.all([
  writeFile(`${OUT_DIR}/flashcards.json`, `${JSON.stringify(data, null, 2)}\n`),
  writeFile(`${OUT_DIR}/config.json`, `${JSON.stringify(config, null, 2)}\n`)
]);

console.log(`Wrote ${cards.length} cards and ${sessionHistory.length} sessions to ${OUT_DIR}/`);
