import { z } from 'zod';
import { parseMachine } from '@/engines/turing';
import { parseProgress, type Progress } from '@/learn/progress-storage';
import { MACHINE_CHANGED_AT_KEY, MACHINE_KEY, PROGRESS_KEY, SYNC_KEY } from '@/storage/keys';
import type { SyncedKey, SyncedKeyValue } from '@/storage/synced-key-value';
import type { AccountClient, ProfilePatch, SavedProfile } from '../account-client';
import { canonicalMachine, decideMachine, mergeProgress, sameProgress } from './merge';

/** What the account menu says about the sync (spec R5b 5 and 6). */
export type SyncStatus = 'saving' | 'saved' | 'offline' | 'too-big';

/** The 2 machines of the machine dialog: their names, and when each changed, when known. */
export interface MachineConflict {
  readonly browser: { readonly name: string; readonly changedAt: string | null };
  readonly saved: { readonly name: string; readonly changedAt: string | null };
}

export interface SyncEngine {
  /** Reads the row once and applies the page-load rules (spec R5b 5). Then it sends each change. */
  start(): Promise<void>;
  /** The dialog answer "Keep this browser's machine": uploads the browser machine. */
  keepBrowserMachine(): Promise<void>;
  /** The dialog answer "Use your saved machine": writes the saved machine to the browser. */
  useSavedMachine(): void;
  /** Ends the sync after a sign-out: no more writes, and every timer and listener is removed. */
  stop(): void;
}

interface SyncEngineOptions {
  userId: string;
  client: Pick<AccountClient, 'readProfile' | 'writeProfile'>;
  values: SyncedKeyValue;
  onStatus: (status: SyncStatus) => void;
  /** Called with the 2 machines when the person must choose, and with null when the choice is made. */
  onConflict: (conflict: MachineConflict | null) => void;
  /** Runs `run` after `ms` milliseconds. Returns the function that cancels it. Tests pass their own. */
  setTimer?: (run: () => void, ms: number) => () => void;
  /** Calls `listener` when the browser is back online. Returns the function that stops it. */
  onlineEvents?: (listener: () => void) => () => void;
}

/** A change is sent this long after it happened, so that quick changes go in 1 write. */
const BATCH_MS = 2000;
/** After a failed read or write, the sync tries again this long later. */
const RETRY_MS = 30_000;
/** The size limits of the database (spec R5b 5), in bytes of JSON text. */
const MACHINE_LIMIT = 262_144;
const PROGRESS_LIMIT = 65_536;

const recordSchema = z.object({ userId: z.string(), machine: z.string().nullable() });

function defaultTimer(run: () => void, ms: number) {
  const id = setTimeout(run, ms);
  return () => clearTimeout(id);
}

function defaultOnlineEvents(listener: () => void) {
  window.addEventListener('online', listener);
  return () => window.removeEventListener('online', listener);
}

/**
 * The size of a value as JSON text, in bytes. Postgres writes jsonb as text with a space after each
 * comma. The indented text here is never shorter, so a value that passes here passes there too.
 */
function jsonBytes(text: string): number {
  return new TextEncoder().encode(text).length;
}

/** The JSON text of a value from the database, or null when there is nothing. */
function textOf(value: unknown): string | null {
  return value === null || value === undefined ? null : JSON.stringify(value);
}

/** The name of a machine in canonical text. The text always parses, because it is canonical. */
function machineName(text: string): string {
  const result = parseMachine(text);
  return result.ok ? result.machine.name : '';
}

/**
 * Syncs the current machine and the quiz scores of one login (spec R5b 5). The browser copy is
 * always written first and always safe. The engine sends a change about 2 seconds later. When the
 * write fails, it tries again every 30 seconds and when the browser is back online.
 */
export function createSyncEngine(options: SyncEngineOptions): SyncEngine {
  const { userId, client, values, onStatus, onConflict } = options;
  const setTimer = options.setTimer ?? defaultTimer;

  let stopped = false;
  /** True after the page-load read worked. No write goes out before. */
  let started = false;
  /** The columns that changed since the last write. */
  const dirty = new Set<'machine' | 'progress'>();
  /** While the machine dialog is open: the saved machine and its time. */
  let pendingChoice: { text: string; changedAt: string | null } | null = null;
  let writing = false;
  /** True when a change came during a write. Then another write follows. */
  let writeAgain = false;
  let cancelBatch: (() => void) | null = null;
  let cancelRetry: (() => void) | null = null;

  const status = (next: SyncStatus) => {
    if (!stopped) onStatus(next);
  };

  /** The machine this browser last synced for this login. A record of another login counts as none. */
  const lastSynced = (): string | null => {
    let saved: unknown;
    try {
      saved = JSON.parse(values.read(SYNC_KEY) ?? 'null');
    } catch {
      return null;
    }
    const record = recordSchema.safeParse(saved);
    return record.success && record.data.userId === userId ? record.data.machine : null;
  };

  const recordSynced = (machine: string | null) => {
    values.write(SYNC_KEY, JSON.stringify({ userId, machine }));
  };

  const cancelTimers = () => {
    cancelBatch?.();
    cancelBatch = null;
    cancelRetry?.();
    cancelRetry = null;
  };

  /** Tries again in 30 seconds, unless a try is already waiting. */
  const retryLater = (run: () => void) => {
    cancelRetry ??= setTimer(() => {
      cancelRetry = null;
      run();
    }, RETRY_MS);
  };

  /** Builds the write from the browser values now. It leaves out what is too big or did not change. */
  const buildPatch = (): { patch: ProfilePatch; machine: string | null; tooBig: boolean } => {
    const patch: { machine?: unknown; machineChangedAt?: string | null; progress?: Progress } = {};
    let machine: string | null = null;
    let tooBig = false;
    if (dirty.has('machine')) {
      const text = canonicalMachine(values.read(MACHINE_KEY));
      if (text !== null && text !== lastSynced()) {
        if (jsonBytes(text) > MACHINE_LIMIT) tooBig = true;
        else {
          patch.machine = JSON.parse(text);
          patch.machineChangedAt = values.read(MACHINE_CHANGED_AT_KEY);
          machine = text;
        }
      }
    }
    if (dirty.has('progress')) {
      const progress = parseProgress(values.read(PROGRESS_KEY));
      if (jsonBytes(JSON.stringify(progress, null, 1)) > PROGRESS_LIMIT) tooBig = true;
      else patch.progress = progress;
    }
    dirty.clear();
    return { patch, machine, tooBig };
  };

  /** Sends the changed columns now. */
  const flush = async (): Promise<void> => {
    cancelBatch?.();
    cancelBatch = null;
    if (stopped || !started) return;
    if (writing) {
      writeAgain = true;
      return;
    }
    cancelRetry?.();
    cancelRetry = null;
    const { patch, machine, tooBig } = buildPatch();
    const columns = Object.keys(patch);
    if (columns.length === 0) {
      status(tooBig ? 'too-big' : 'saved');
      return;
    }
    writing = true;
    status('saving');
    const result = await client.writeProfile(userId, patch);
    writing = false;
    if (stopped) return;
    if (result === 'ok') {
      if (machine !== null) recordSynced(machine);
      status(tooBig ? 'too-big' : 'saved');
    } else if (result === 'too-big') {
      status('too-big');
    } else {
      // The browser keeps the change. The next write sends it again.
      if ('machine' in patch) dirty.add('machine');
      if ('progress' in patch) dirty.add('progress');
      status('offline');
      if (result === 'offline') retryLater(() => void flush());
    }
    if (writeAgain) {
      writeAgain = false;
      await flush();
    }
  };

  const onLocalChange = (key: SyncedKey) => {
    if (stopped || !started) return;
    // While the dialog is open, the person has not chosen a machine yet.
    if (key === MACHINE_KEY && pendingChoice !== null) return;
    dirty.add(key === MACHINE_KEY ? 'machine' : 'progress');
    status('saving');
    cancelBatch ??= setTimer(() => {
      cancelBatch = null;
      void flush();
    }, BATCH_MS);
  };

  /** Applies the page-load rules to the machine. */
  const startMachine = (saved: SavedProfile | null) => {
    const browserText = canonicalMachine(values.read(MACHINE_KEY));
    const savedText = canonicalMachine(textOf(saved?.machine));
    const savedChangedAt = saved?.machineChangedAt ?? null;
    switch (decideMachine(browserText, savedText, lastSynced())) {
      case 'record':
        recordSynced(browserText);
        break;
      case 'take-saved':
        if (savedText === null) break;
        values.writeFromAccount(MACHINE_KEY, savedText, savedChangedAt);
        recordSynced(savedText);
        break;
      case 'upload-browser':
        dirty.add('machine');
        break;
      case 'ask':
        if (browserText === null || savedText === null) break;
        pendingChoice = { text: savedText, changedAt: savedChangedAt };
        onConflict({
          browser: { name: machineName(browserText), changedAt: values.read(MACHINE_CHANGED_AT_KEY) },
          saved: { name: machineName(savedText), changedAt: savedChangedAt },
        });
        break;
      case 'nothing':
        break;
    }
  };

  /** Merges the quiz scores. Each side gets the merge when it lacks something. */
  const startProgress = (saved: SavedProfile | null) => {
    const browser = parseProgress(values.read(PROGRESS_KEY));
    const savedProgress = parseProgress(textOf(saved?.progress));
    const merged = mergeProgress(browser, savedProgress);
    if (!sameProgress(merged, browser)) values.writeFromAccount(PROGRESS_KEY, JSON.stringify(merged));
    if (saved !== null ? !sameProgress(merged, savedProgress) : Object.keys(merged).length > 0) dirty.add('progress');
  };

  const start = async (): Promise<void> => {
    if (stopped || started) return;
    status('saving');
    let saved: SavedProfile | null;
    try {
      saved = await client.readProfile(userId);
    } catch {
      if (stopped) return;
      status('offline');
      retryLater(() => void start());
      return;
    }
    if (stopped) return;
    startMachine(saved);
    startProgress(saved);
    started = true;
    await flush();
  };

  const stopLocal = values.onLocalChange(onLocalChange);
  const stopOnline = (options.onlineEvents ?? defaultOnlineEvents)(() => {
    if (stopped) return;
    if (!started) {
      cancelRetry?.();
      cancelRetry = null;
      void start();
    } else if (dirty.size > 0 && cancelRetry !== null) {
      void flush();
    }
  });

  return {
    start,
    async keepBrowserMachine() {
      if (pendingChoice === null) return;
      pendingChoice = null;
      onConflict(null);
      dirty.add('machine');
      await flush();
    },
    useSavedMachine() {
      if (pendingChoice === null) return;
      const { text, changedAt } = pendingChoice;
      pendingChoice = null;
      values.writeFromAccount(MACHINE_KEY, text, changedAt);
      recordSynced(text);
      onConflict(null);
    },
    stop() {
      stopped = true;
      cancelTimers();
      stopLocal();
      stopOnline();
    },
  };
}
