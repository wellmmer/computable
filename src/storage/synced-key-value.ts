import { createKeyValue, type KeyValue } from './key-value';
import { MACHINE_CHANGED_AT_KEY, MACHINE_KEY, PROGRESS_KEY } from './keys';

/** The 2 keys that an account syncs (spec R5b 5). The theme, the language and the tour stay per device. */
export type SyncedKey = typeof MACHINE_KEY | typeof PROGRESS_KEY;

/**
 * The browser values, with news for the sync (spec R5b 5). The simulator and the quiz code write
 * through it as before. It tells the sync when the page changed the machine or the quiz scores, and
 * it tells the page when the sync wrote a value that came from the account.
 */
export interface SyncedKeyValue extends KeyValue {
  /** Calls `listener` after the page changed a synced key. Returns the function that stops it. */
  onLocalChange(listener: (key: SyncedKey) => void): () => void;
  /** Calls `listener` after `writeFromAccount`. Returns the function that stops it. */
  onAccountChange(listener: (key: SyncedKey) => void): () => void;
  /**
   * Writes a value that came from the account. For the machine, `changedAt` is when it last changed
   * in a browser; without it, the browser forgets the old time.
   */
  writeFromAccount(key: SyncedKey, value: string, changedAt?: string | null): void;
}

function isSyncedKey(key: string): key is SyncedKey {
  return key === MACHINE_KEY || key === PROGRESS_KEY;
}

/** Wraps `inner`. `now` gives the time of a page change to the machine; tests pass a fixed one. */
export function createSyncedKeyValue(inner: KeyValue, now: () => Date = () => new Date()): SyncedKeyValue {
  const localListeners = new Set<(key: SyncedKey) => void>();
  const accountListeners = new Set<(key: SyncedKey) => void>();

  const listen = (listeners: Set<(key: SyncedKey) => void>, listener: (key: SyncedKey) => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };
  const tell = (listeners: Set<(key: SyncedKey) => void>, key: SyncedKey) => {
    for (const listener of listeners) listener(key);
  };

  return {
    get persistent() {
      return inner.persistent;
    },
    read: (key) => inner.read(key),
    write(key, value) {
      // The simulator saves the machine again after it loads it. The same text is not a change.
      const changed = isSyncedKey(key) && inner.read(key) !== value;
      inner.write(key, value);
      if (!changed) return;
      if (key === MACHINE_KEY) inner.write(MACHINE_CHANGED_AT_KEY, now().toISOString());
      tell(localListeners, key);
    },
    remove(key) {
      const changed = isSyncedKey(key) && inner.read(key) !== null;
      inner.remove(key);
      if (changed) tell(localListeners, key);
    },
    onLocalChange: (listener) => listen(localListeners, listener),
    onAccountChange: (listener) => listen(accountListeners, listener),
    writeFromAccount(key, value, changedAt) {
      inner.write(key, value);
      if (key === MACHINE_KEY) {
        if (typeof changedAt === 'string') inner.write(MACHINE_CHANGED_AT_KEY, changedAt);
        else inner.remove(MACHINE_CHANGED_AT_KEY);
      }
      tell(accountListeners, key);
    },
  };
}

let shared: SyncedKeyValue | null = null;

/**
 * The browser values of this page. The simulator, the quiz code and the sync all use this one copy,
 * so the sync hears every change. Only the browser calls this, never the server.
 */
export function sharedBrowserValues(): SyncedKeyValue {
  shared ??= createSyncedKeyValue(createKeyValue(() => window.localStorage));
  return shared;
}
