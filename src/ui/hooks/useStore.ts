import { createContext, useContext, useSyncExternalStore } from 'react';
import type { AppState } from '../../state/reducer.js';
import type { AppAction } from '../../state/actions.js';
import type { Store } from '../../state/store.js';

export const StoreContext = createContext<Store | null>(null);

function useStoreInstance(): Store {
  const store = useContext(StoreContext);
  if (!store) {
    throw new Error('useStore must be used inside a StoreProvider');
  }
  return store;
}

/**
 * Subscribe to the whole snapshot.
 *
 * Deliberately not selector-based: a selector returning a fresh array on every call
 * would loop forever, and the shallow-compare workarounds are a footgun. State
 * changes a few times per second at most and Ink's diff is cheap, so derive
 * with `useMemo(() => selector(state), [state])` — snapshot identity only
 * changes on a real mutation, which makes that cache exact.
 */
export function useAppState(): AppState {
  const store = useStoreInstance();
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}

export function useDispatch(): (action: AppAction) => void {
  return useStoreInstance().dispatch;
}
