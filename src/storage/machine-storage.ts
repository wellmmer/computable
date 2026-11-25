import { parseMachine, serializeMachine, type Machine } from '@/engines/turing';
import { createKeyValue, type KeyValue } from './key-value';
import { MACHINE_KEY } from './keys';
import { sharedBrowserValues, type SyncedKeyValue } from './synced-key-value';

export { MACHINE_KEY };

/** A one-time note the app shows once per browser. */
export type NoteId = 'left-edge';

/**
 * Where the simulator keeps the current machine (spec 5.6). Plan R5 adds accounts behind this
 * same interface, so the simulator never talks to localStorage directly.
 */
export interface MachineStorage {
  /** False when the browser blocks storage. The machine then lives in memory until the tab closes. */
  readonly persistent: boolean;
  loadMachine(): Machine | null;
  saveMachine(machine: Machine): void;
  hasSeen(note: NoteId): boolean;
  markSeen(note: NoteId): void;
  /**
   * Calls `listener` with the machine that the sync wrote from the account (spec R5b 5). Unreadable
   * text calls nothing. Storage without an account never calls. Returns the function that stops it.
   */
  onMachineFromAccount(listener: (machine: Machine) => void): () => void;
}

const seenKey = (note: NoteId) => `computable.seen.${note}`;

/** Reads the machine text. Text that is not a machine reads as no machine. */
function readMachine(values: KeyValue): Machine | null {
  const text = values.read(MACHINE_KEY);
  if (text === null) return null;
  const result = parseMachine(text);
  return result.ok ? result.machine : null;
}

function createStorage(values: KeyValue, synced: SyncedKeyValue | null): MachineStorage {
  return {
    get persistent() {
      return values.persistent;
    },
    loadMachine: () => readMachine(values),
    saveMachine(machine) {
      values.write(MACHINE_KEY, serializeMachine(machine));
    },
    hasSeen(note) {
      return values.read(seenKey(note)) === '1';
    },
    markSeen(note) {
      values.write(seenKey(note), '1');
    },
    onMachineFromAccount(listener) {
      if (synced === null) return () => {};
      return synced.onAccountChange((key) => {
        if (key !== MACHINE_KEY) return;
        const machine = readMachine(synced);
        if (machine !== null) listener(machine);
      });
    },
  };
}

/** Storage over values that an account can sync: it hears the machines that come from the account. */
export function createSyncedStorage(values: SyncedKeyValue): MachineStorage {
  return createStorage(values, values);
}

/**
 * Storage in the browser's localStorage, with an in-memory fallback. With no argument it uses the
 * values that the account sync shares on the page. Tests pass their own `getStorage`.
 */
export function createBrowserStorage(getStorage?: () => Storage): MachineStorage {
  return getStorage === undefined ? createSyncedStorage(sharedBrowserValues()) : createStorage(createKeyValue(getStorage), null);
}

/** Storage that only lives in memory: for the server render and for tests. */
export function createMemoryStorage(): MachineStorage {
  return createStorage(createKeyValue(null), null);
}
