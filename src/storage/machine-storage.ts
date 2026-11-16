import { parseMachine, serializeMachine, type Machine } from '@/engines/turing';
import { createKeyValue, type KeyValue } from './key-value';

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
}

export const MACHINE_KEY = 'computable.machine';
const seenKey = (note: NoteId) => `computable.seen.${note}`;

function createStorage(values: KeyValue): MachineStorage {
  return {
    get persistent() {
      return values.persistent;
    },
    loadMachine() {
      const text = values.read(MACHINE_KEY);
      if (text === null) return null;
      const result = parseMachine(text);
      return result.ok ? result.machine : null;
    },
    saveMachine(machine) {
      values.write(MACHINE_KEY, serializeMachine(machine));
    },
    hasSeen(note) {
      return values.read(seenKey(note)) === '1';
    },
    markSeen(note) {
      values.write(seenKey(note), '1');
    },
  };
}

/** Storage in the browser's localStorage, with an in-memory fallback. */
export function createBrowserStorage(getStorage: () => Storage = () => window.localStorage): MachineStorage {
  return createStorage(createKeyValue(getStorage));
}

/** Storage that only lives in memory: for the server render and for tests. */
export function createMemoryStorage(): MachineStorage {
  return createStorage(createKeyValue(null));
}
