import { z } from 'zod';
import { parseMachine } from '@/engines/turing';
import { parseProgress, type Progress } from '@/learn/progress-storage';
import { MACHINE_CHANGED_AT_KEY, MACHINE_KEY, PROGRESS_KEY, SYNC_KEY } from '@/storage/keys';
import type { SyncedKey, SyncedKeyValue } from '@/storage/synced-key-value';
import { AccountSignedOutError, type AccountClient, type ProfilePatch, type SavedProfile } from '../account-client';
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
  /** True after "Keep this browser's machine": the next machine write goes out without the check. */
  let keepBrowser = false;
  /** The columns that are over the size limit. The status says "too big" until a write of each one works. */
  const tooBig = new Set<'machine' | 'progress'>();

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

  /** The status after a write, or after a change that needed no write. */
  const settledStatus = (): SyncStatus => (tooBig.size > 0 ? 'too-big' : 'saved');

  /** Opens the machine dialog. Machine changes wait until the person chooses. */
  const ask = (browserText: string, savedText: string, savedChangedAt: string | null) => {
    pendingChoice = { text: savedText, changedAt: savedChangedAt };
    onConflict({
      browser: { name: machineName(browserText), changedAt: values.read(MACHINE_CHANGED_AT_KEY) },
      saved: { name: machineName(savedText), changedAt: savedChangedAt },
    });
  };

  /**
   * Builds the write from the browser values and the row as read just before. Another device may
   * have written the row since this page loaded. So a machine that changed there is never written
   * over: the dialog asks first. The scores are merged with the saved ones.
   */
  const buildPatch = (saved: SavedProfile | null): { patch: ProfilePatch; machine: string | null } => {
    const patch: { machine?: unknown; machineChangedAt?: string | null; progress?: Progress } = {};
    let machine: string | null = null;
    if (dirty.has('machine')) {
      const text = canonicalMachine(values.read(MACHINE_KEY));
      const savedText = canonicalMachine(textOf(saved?.machine));
      const last = lastSynced();
      const forced = keepBrowser;
      keepBrowser = false;
      if (text === null || text === last || text === savedText) {
        // Nothing new to send. A machine back to the one last synced fits.
        if (text !== null && text === savedText) recordSynced(text);
        tooBig.delete('machine');
      } else if (!forced && savedText !== null && savedText !== last) {
        ask(text, savedText, saved?.machineChangedAt ?? null);
      } else if (jsonBytes(text) > MACHINE_LIMIT) {
        tooBig.add('machine');
      } else {
        patch.machine = JSON.parse(text);
        patch.machineChangedAt = values.read(MACHINE_CHANGED_AT_KEY);
        machine = text;
      }
    }
    if (dirty.has('progress')) {
      const browser = parseProgress(values.read(PROGRESS_KEY));
      const savedProgress = parseProgress(textOf(saved?.progress));
      const merged = mergeProgress(browser, savedProgress);
      if (!sameProgress(merged, browser)) values.writeFromAccount(PROGRESS_KEY, JSON.stringify(merged));
      if (sameProgress(merged, savedProgress)) tooBig.delete('progress');
      else if (jsonBytes(JSON.stringify(merged, null, 1)) > PROGRESS_LIMIT) tooBig.add('progress');
      else patch.progress = merged;
    }
    dirty.clear();
    return { patch, machine };
  };

  /** What happens after a failed read: try again later, or stop when the login is not valid any more. */
  const readFailed = (error: unknown, again: () => void) => {
    status('offline');
    // A login that is not valid any more stays so. The person must sign in again.
    if (error instanceof AccountSignedOutError) stopped = true;
    else retryLater(again);
  };

  /**
   * Reads the row, then sends the changed columns. `saved` is the row when the caller has just read
   * it, as on page load.
   */
  const flush = async (saved?: SavedProfile | null): Promise<void> => {
    cancelBatch?.();
    cancelBatch = null;
    if (stopped || !started) return;
    if (writing) {
      writeAgain = true;
      return;
    }
    cancelRetry?.();
    cancelRetry = null;
    if (dirty.size === 0) {
      status(settledStatus());
      return;
    }
    writing = true;
    status('saving');
    let row: SavedProfile | null;
    if (saved === undefined) {
      try {
        row = await client.readProfile(userId);
      } catch (error) {
        writing = false;
        if (!stopped) readFailed(error, () => void flush());
        return;
      }
    } else row = saved;
    if (stopped) return;
    const { patch, machine } = buildPatch(row);
    const result = Object.keys(patch).length === 0 ? 'none' : await client.writeProfile(userId, patch);
    writing = false;
    if (stopped) return;
    if (result === 'none') {
      status(settledStatus());
    } else if (result === 'ok') {
      if (machine !== null) recordSynced(machine);
      if ('machine' in patch) tooBig.delete('machine');
      if ('progress' in patch) tooBig.delete('progress');
      status(settledStatus());
    } else if (result === 'too-big') {
      // The database does not say which column was too big. The machine goes again with its next
      // change. The scores stay marked, so the next write sends them again.
      if ('machine' in patch) tooBig.add('machine');
      if ('progress' in patch) {
        tooBig.add('progress');
        dirty.add('progress');
      }
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
        if (browserText !== null && savedText !== null) ask(browserText, savedText, savedChangedAt);
        break;
      case 'nothing':
        break;
    }
  };

  const start = async (): Promise<void> => {
    if (stopped || started) return;
    status('saving');
    let saved: SavedProfile | null;
    try {
      saved = await client.readProfile(userId);
    } catch (error) {
      if (!stopped) readFailed(error, () => void start());
      return;
    }
    if (stopped) return;
    startMachine(saved);
    // The scores always merge on page load. The write goes out only when the account lacks something.
    dirty.add('progress');
    started = true;
    await flush(saved);
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
      keepBrowser = true;
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
