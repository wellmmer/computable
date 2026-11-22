import { useSyncExternalStore } from 'react';
import { randomKey, type SecretKey } from './random-key';
import { encryptSecret } from './secret';
import { createBrowserSecretStorage, SECRET_KEY, type SavedSecret, type SecretStorage } from './secret-storage';

// One copy per page load. A save or "Forget my secret" in another tab updates it through the "storage" event.
let storage: SecretStorage | null = null;
let snapshot: SavedSecret | null | undefined;
const listeners = new Set<() => void>();

/** Opens the browser storage on first use. Only the browser calls this, never the server. */
function openStorage(): SecretStorage {
  storage ??= createBrowserSecretStorage();
  return storage;
}

/** The same object until the secret changes, as useSyncExternalStore needs. */
function currentSecret(): SavedSecret | null {
  if (snapshot === undefined) snapshot = openStorage().load();
  return snapshot;
}

function publish(next: SavedSecret | null) {
  snapshot = next;
  for (const listener of listeners) listener();
}

/** Another tab saved or forgot the secret. A null key means the other tab cleared all of localStorage. */
function onStorage(event: StorageEvent) {
  if (event.key !== SECRET_KEY && event.key !== null) return;
  publish(openStorage().load());
}

function subscribe(listener: () => void) {
  if (listeners.size === 0) {
    window.addEventListener('storage', onStorage);
    // Another tab may have changed the secret while no page here listened. React reads the snapshot again after this.
    const saved = openStorage().load();
    if (JSON.stringify(saved) !== JSON.stringify(snapshot)) snapshot = saved;
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener('storage', onStorage);
  };
}

/** The server cannot see the browser storage, so it does not know the secret yet. */
function serverSecret(): undefined {
  return undefined;
}

/**
 * Saves the text the visitor typed, with its secret letters and its key. A new secret gets a random key
 * (spec R4 4): the first text after "Forget my secret", or after the visitor erased the whole text.
 * Typing more keeps the key, so the secret letters typed so far never change. A secret saved before
 * R4b keeps its key too. An empty text saves nothing and ends the secret. Returns what it saved.
 * The key is drawn here, in the browser, never on the server.
 */
export function saveSecret(plain: string, drawKey: () => SecretKey = randomKey): SavedSecret | null {
  if (plain === '') {
    forgetSecret();
    return null;
  }
  const { settings, start } = currentSecret() ?? drawKey();
  const secret: SavedSecret = { plain, cipher: encryptSecret(plain, { settings, start }).cipher, settings, start };
  openStorage().save(secret);
  publish(secret);
  return secret;
}

/** The secret saved in this browser, read now. The labs read it when a Home button opens them. */
export function readSecret(): SavedSecret | null {
  return openStorage().load();
}

/** "Forget my secret" (spec R3 4). */
export function forgetSecret() {
  openStorage().forget();
  publish(null);
}

/** Home's secret in this browser: null when there is none, undefined on the server and while the page hydrates. */
export function useSecret(): SavedSecret | null | undefined {
  return useSyncExternalStore(subscribe, currentSecret, serverSecret);
}
