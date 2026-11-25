'use client';

import { useEffect, useState } from 'react';
import { createBrowserStorage, createMemoryStorage } from '@/storage/machine-storage';
import { createSimulatorStore } from '../store';
import { SimulatorView } from './SimulatorView';
import { SimulatorStoreProvider } from './store-context';

/**
 * Drops a share link from the URL and keeps the path and search. The machine is saved now,
 * so a reload must not undo later changes.
 */
function dropLinkFromUrl() {
  if (window.location.hash.startsWith('#m=')) {
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
  }
}

/**
 * The simulator with its own store. The server renders Binary +1; after hydration, the store opens
 * the machine from a share link or from browser storage. A link pasted into the address bar later opens too.
 * A machine that the account sync writes to the browser opens too (spec R5b 5).
 */
export function Simulator() {
  const [{ store, storage }] = useState(() => {
    const storage = typeof window === 'undefined' ? createMemoryStorage() : createBrowserStorage();
    return { store: createSimulatorStore({ storage }), storage };
  });

  useEffect(() => {
    store.getState().boot(window.location.hash);
    // While the simulator asks before a link replaces the visitor's machine, the link stays in the
    // address, so a reload asks again. Either answer drops it, so a reload does not ask again.
    if (store.getState().pendingLink === null) dropLinkFromUrl();
    const unsubscribe = store.subscribe((state, previous) => {
      if (previous.pendingLink !== null && state.pendingLink === null) dropLinkFromUrl();
    });
    // Pasting a link into the address bar of an open tab changes only the hash; the page does not reload.
    // The paste also added a history entry. Going back to the entry before it means the next Back
    // leaves the page, instead of showing the same page again. Forward opens the link again.
    const onHashChange = () => {
      if (!window.location.hash.startsWith('#m=')) return;
      store.getState().openLink(window.location.hash);
      window.history.back();
    };
    window.addEventListener('hashchange', onHashChange);
    const stopAccount = storage.onMachineFromAccount((machine) => store.getState().loadMachine(machine));
    return () => {
      window.removeEventListener('hashchange', onHashChange);
      stopAccount();
      unsubscribe();
      store.getState().pause();
    };
  }, [store, storage]);

  return (
    <SimulatorStoreProvider store={store}>
      <SimulatorView />
    </SimulatorStoreProvider>
  );
}
