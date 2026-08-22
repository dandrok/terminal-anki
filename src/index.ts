/**
 * Public entry point for consuming Terminal Anki as a library.
 * The executable lives in `cli/main.ts`.
 */
export { createStore, type Store, type StoreOptions } from './state/store.js';
export { createInitialState, reduce, type AppState } from './state/reducer.js';
export type { AppAction, UndoEntry } from './state/actions.js';
export * as selectors from './state/selectors.js';

export { createRepository, type Repository } from './storage/repository.js';
export { resolveDataDir, resolveDataFile } from './storage/paths.js';

export * as sm2 from './core/sm2.js';
export * as filters from './core/filters.js';
export * as stats from './core/stats.js';
export * as streaks from './core/streaks.js';
export * as achievements from './core/achievements.js';

export type * from './types/index.js';
