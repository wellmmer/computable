/**
 * Text by key, in the browser's storage while it allows it, and always in memory. The machine
 * storage and the quiz progress both sit on it, so both keep working when the browser blocks storage.
 */
export interface KeyValue {
  /** False when the browser blocks storage. Values then live in memory until the tab closes. */
  readonly persistent: boolean;
  read(key: string): string | null;
  write(key: string, value: string): void;
  remove(key: string): void;
}

const PROBE_KEY = 'computable.probe';

/** Returns the browser storage, or null when reading or writing it throws. */
function openStorage(getStorage: () => Storage): Storage | null {
  try {
    const storage = getStorage();
    storage.setItem(PROBE_KEY, '1');
    storage.removeItem(PROBE_KEY);
    return storage;
  } catch {
    return null;
  }
}

/**
 * Keeps every value in memory and, while the browser allows it, in `getStorage()` too.
 * When a read or write throws (blocked storage, a full quota), it keeps working from memory.
 * `null` keeps values in memory only: for the server render and for tests.
 */
export function createKeyValue(getStorage: (() => Storage) | null): KeyValue {
  const memory = new Map<string, string>();
  let backing = getStorage === null ? null : openStorage(getStorage);

  return {
    get persistent() {
      return backing !== null;
    },
    read(key) {
      if (backing !== null) {
        try {
          return backing.getItem(key);
        } catch {
          backing = null;
        }
      }
      return memory.get(key) ?? null;
    },
    write(key, value) {
      memory.set(key, value);
      if (backing === null) return;
      try {
        backing.setItem(key, value);
      } catch {
        backing = null;
      }
    },
    remove(key) {
      memory.delete(key);
      if (backing === null) return;
      try {
        backing.removeItem(key);
      } catch {
        backing = null;
      }
    },
  };
}
