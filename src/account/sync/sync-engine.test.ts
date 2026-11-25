import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { serializeMachine, type Machine } from '@/engines/turing';
import { machine } from '@/engines/turing/test-helpers';
import type { Progress } from '@/learn/progress-storage';
import { createKeyValue } from '@/storage/key-value';
import { MACHINE_CHANGED_AT_KEY, MACHINE_KEY, PROGRESS_KEY, SYNC_KEY } from '@/storage/keys';
import { createSyncedKeyValue } from '@/storage/synced-key-value';
import { AccountSignedOutError, type ProfilePatch, type SavedProfile, type WriteResult } from '../account-client';
import { createSyncEngine, type MachineConflict, type SyncStatus } from './sync-engine';

const USER = 'id-a';
const NOW = new Date('2026-11-25T10:00:00.000Z');
const rule = { state: 'q0', read: '1', write: '0', move: 'R', next: 'qA' } as const;
const OLD = machine([rule], { name: 'Old one' });
const MINE = machine([rule], { name: 'Mine' });
const SAVED = machine([rule], { name: 'Saved one' });
const text = (m: Machine) => serializeMachine(m);
const result = (best: number, total: number, finishedAt: string) => ({ best, total, finishedAt });

interface Setup {
  /** The person's row. Null means no row yet. */
  profile?: SavedProfile | null;
  /** How the writes end, in order. Later writes end with 'ok'. */
  results?: WriteResult[];
  /** The browser values before the engine starts. */
  browser?: Record<string, string>;
}

function setup({ profile = null, results = [], browser = {} }: Setup = {}) {
  const inner = createKeyValue(null);
  for (const [key, value] of Object.entries(browser)) inner.write(key, value);
  const values = createSyncedKeyValue(inner, () => NOW);
  const writes: ProfilePatch[] = [];
  /** The row now. Another device can change it between 2 writes. */
  const row = { current: profile };
  const client = {
    readProfile: vi.fn(async (): Promise<SavedProfile | null> => row.current),
    writeProfile: vi.fn(async (_userId: string, patch: ProfilePatch): Promise<WriteResult> => {
      writes.push(patch);
      return results.shift() ?? 'ok';
    }),
  };
  const statuses: SyncStatus[] = [];
  const conflicts: (MachineConflict | null)[] = [];
  const fromAccount: string[] = [];
  values.onAccountChange((key) => fromAccount.push(key));
  const online = { listener: null as (() => void) | null };
  const engine = createSyncEngine({
    userId: USER,
    client,
    values,
    onStatus: (status) => statuses.push(status),
    onConflict: (conflict) => conflicts.push(conflict),
    onlineEvents: (listener) => {
      online.listener = listener;
      return () => {
        online.listener = null;
      };
    },
  });
  const record = () => JSON.parse(values.read(SYNC_KEY) ?? 'null');
  const lastStatus = () => statuses.at(-1);
  /** Another device writes the row. */
  const otherDeviceWrites = (next: SavedProfile | null) => {
    row.current = next;
  };
  return { engine, values, client, writes, statuses, conflicts, fromAccount, online, record, lastStatus, otherDeviceWrites };
}

/** A row with the saved machine and scores. */
const row = (savedMachine: Machine | null, progress: Progress = {}, machineChangedAt: string | null = '2026-11-24T18:30:00.000Z'): SavedProfile => ({
  // The database gives the machine as an object, with its keys in another order.
  machine: savedMachine === null ? null : Object.fromEntries(Object.entries(savedMachine).reverse()),
  machineChangedAt,
  progress,
});

beforeEach(() => {
  vi.useFakeTimers({ now: NOW });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('createSyncEngine, the machine on page load (spec R5b 5)', () => {
  it('replaces a browser machine that did not change since the last sync with the saved one', async () => {
    const sync = setup({
      profile: row(SAVED),
      browser: { [MACHINE_KEY]: text(OLD), [SYNC_KEY]: JSON.stringify({ userId: USER, machine: text(OLD) }) },
    });
    await sync.engine.start();
    expect(sync.values.read(MACHINE_KEY)).toBe(text(SAVED));
    expect(sync.values.read(MACHINE_CHANGED_AT_KEY)).toBe('2026-11-24T18:30:00.000Z');
    expect(sync.fromAccount).toEqual([MACHINE_KEY]);
    expect(sync.record()).toEqual({ userId: USER, machine: text(SAVED) });
    expect(sync.writes).toEqual([]);
    expect(sync.lastStatus()).toBe('saved');
  });

  it('takes the saved machine when the browser has none', async () => {
    const sync = setup({ profile: row(SAVED) });
    await sync.engine.start();
    expect(sync.values.read(MACHINE_KEY)).toBe(text(SAVED));
    expect(sync.writes).toEqual([]);
  });

  it('uploads the browser machine when the account has none, with the time it changed', async () => {
    const sync = setup({ browser: { [MACHINE_KEY]: text(MINE), [MACHINE_CHANGED_AT_KEY]: '2026-11-25T09:00:00.000Z' } });
    await sync.engine.start();
    expect(sync.writes).toEqual([{ machine: JSON.parse(text(MINE)), machineChangedAt: '2026-11-25T09:00:00.000Z' }]);
    expect(sync.record()).toEqual({ userId: USER, machine: text(MINE) });
    expect(sync.lastStatus()).toBe('saved');
  });

  it('uploads the browser machine when the saved one did not change since the last sync', async () => {
    const sync = setup({
      profile: row(OLD),
      browser: { [MACHINE_KEY]: text(MINE), [SYNC_KEY]: JSON.stringify({ userId: USER, machine: text(OLD) }) },
    });
    await sync.engine.start();
    expect(sync.writes).toEqual([{ machine: JSON.parse(text(MINE)), machineChangedAt: null }]);
  });

  it('only records the machine when both sides hold the same one, whatever the key order', async () => {
    const sync = setup({ profile: row(MINE), browser: { [MACHINE_KEY]: text(MINE) } });
    await sync.engine.start();
    expect(sync.writes).toEqual([]);
    expect(sync.fromAccount).toEqual([]);
    expect(sync.record()).toEqual({ userId: USER, machine: text(MINE) });
  });

  it('asks when both machines changed, and a sync record of another login counts as no sync', async () => {
    const sync = setup({
      profile: row(SAVED),
      browser: {
        [MACHINE_KEY]: text(MINE),
        [MACHINE_CHANGED_AT_KEY]: '2026-11-25T09:00:00.000Z',
        [SYNC_KEY]: JSON.stringify({ userId: 'id-b', machine: text(MINE) }),
      },
    });
    await sync.engine.start();
    expect(sync.conflicts).toEqual([
      { browser: { name: 'Mine', changedAt: '2026-11-25T09:00:00.000Z' }, saved: { name: 'Saved one', changedAt: '2026-11-24T18:30:00.000Z' } },
    ]);
    expect(sync.values.read(MACHINE_KEY)).toBe(text(MINE));
    expect(sync.writes).toEqual([]);
  });

  it('asks, and writes nothing, when the browser machine of another login differs from the saved one', async () => {
    const sync = setup({
      profile: row(SAVED, { saved: result(1, 2, '2026-11-24T10:00:00.000Z') }),
      browser: {
        [MACHINE_KEY]: text(MINE),
        [PROGRESS_KEY]: JSON.stringify({ theirs: result(2, 2, '2026-11-24T11:00:00.000Z') }),
        [SYNC_KEY]: JSON.stringify({ userId: 'id-b', machine: text(MINE) }),
      },
    });
    await sync.engine.start();
    expect(sync.conflicts).toHaveLength(1);
    // The scores of the other login are in its own account. This account's scores replace them.
    expect(JSON.parse(sync.values.read(PROGRESS_KEY) ?? 'null')).toEqual({ saved: result(1, 2, '2026-11-24T10:00:00.000Z') });
    expect(sync.writes).toEqual([]);
  });

  it('does not upload the machine or the scores of another login to an account without a row', async () => {
    const sync = setup({
      browser: {
        [MACHINE_KEY]: text(MINE),
        [PROGRESS_KEY]: JSON.stringify({ theirs: result(2, 2, '2026-11-24T11:00:00.000Z') }),
        [SYNC_KEY]: JSON.stringify({ userId: 'id-b', machine: text(MINE) }),
      },
    });
    await sync.engine.start();
    expect(sync.writes).toEqual([]);
    expect(sync.conflicts).toEqual([]);
    expect(JSON.parse(sync.values.read(PROGRESS_KEY) ?? 'null')).toEqual({});
    expect(sync.record()).toEqual({ userId: USER, machine: text(MINE) });
    // A change by this person is theirs, so it goes up.
    sync.values.write(MACHINE_KEY, text(OLD));
    await vi.advanceTimersByTimeAsync(2000);
    expect(sync.writes).toEqual([{ machine: JSON.parse(text(OLD)), machineChangedAt: NOW.toISOString() }]);
  });

  it('does not upload the machine of another login on the next page load either', async () => {
    const browser = { [MACHINE_KEY]: text(MINE), [SYNC_KEY]: JSON.stringify({ userId: 'id-b', machine: text(MINE) }) };
    const first = setup({ browser });
    await first.engine.start();
    first.engine.stop();
    const again = setup({ browser: { [MACHINE_KEY]: text(MINE), [SYNC_KEY]: first.values.read(SYNC_KEY) ?? '' } });
    await again.engine.start();
    expect(again.writes).toEqual([]);
  });

  it('only records the machine when the browser machine of another login is the saved one', async () => {
    const sync = setup({ profile: row(MINE), browser: { [MACHINE_KEY]: text(MINE), [SYNC_KEY]: JSON.stringify({ userId: 'id-b', machine: null }) } });
    await sync.engine.start();
    expect(sync.writes).toEqual([]);
    expect(sync.conflicts).toEqual([]);
    expect(sync.record()).toEqual({ userId: USER, machine: text(MINE) });
  });

  it('merges and uploads on the first sign-in in this browser, when there is no sync record at all', async () => {
    const scores = { mine: result(2, 2, '2026-11-24T11:00:00.000Z') };
    const sync = setup({ browser: { [MACHINE_KEY]: text(MINE), [PROGRESS_KEY]: JSON.stringify(scores) } });
    await sync.engine.start();
    expect(sync.writes).toEqual([{ machine: JSON.parse(text(MINE)), machineChangedAt: null, progress: scores }]);
  });

  it('"Keep this browser\'s machine" uploads it and closes the question', async () => {
    const sync = setup({ profile: row(SAVED), browser: { [MACHINE_KEY]: text(MINE) } });
    await sync.engine.start();
    await sync.engine.keepBrowserMachine();
    expect(sync.conflicts.at(-1)).toBeNull();
    expect(sync.writes).toEqual([{ machine: JSON.parse(text(MINE)), machineChangedAt: null }]);
    expect(sync.record()).toEqual({ userId: USER, machine: text(MINE) });
    expect(sync.lastStatus()).toBe('saved');
  });

  it('"Use your saved machine" writes it to the browser and closes the question', async () => {
    const sync = setup({ profile: row(SAVED), browser: { [MACHINE_KEY]: text(MINE) } });
    await sync.engine.start();
    sync.engine.useSavedMachine();
    expect(sync.conflicts.at(-1)).toBeNull();
    expect(sync.values.read(MACHINE_KEY)).toBe(text(SAVED));
    expect(sync.values.read(MACHINE_CHANGED_AT_KEY)).toBe('2026-11-24T18:30:00.000Z');
    expect(sync.record()).toEqual({ userId: USER, machine: text(SAVED) });
    expect(sync.writes).toEqual([]);
  });

  it('treats a saved machine that does not parse as no saved machine', async () => {
    const sync = setup({ profile: { machine: { format: 'something else' }, machineChangedAt: null, progress: {} }, browser: { [MACHINE_KEY]: text(MINE) } });
    await sync.engine.start();
    expect(sync.writes).toEqual([{ machine: JSON.parse(text(MINE)), machineChangedAt: null }]);
  });
});

describe('createSyncEngine, the quiz scores on page load (spec R5b 5)', () => {
  const T1 = '2026-11-20T10:00:00.000Z';
  const T2 = '2026-11-22T10:00:00.000Z';

  it('writes the merge to the browser and uploads it when it differs from both sides', async () => {
    const sync = setup({
      profile: row(null, { intuition: result(2, 5, T2), other: result(1, 3, T1) }),
      browser: { [PROGRESS_KEY]: JSON.stringify({ intuition: result(4, 5, T1) }) },
    });
    await sync.engine.start();
    const merged = { intuition: result(4, 5, T2), other: result(1, 3, T1) };
    expect(JSON.parse(sync.values.read(PROGRESS_KEY) ?? 'null')).toEqual(merged);
    expect(sync.fromAccount).toEqual([PROGRESS_KEY]);
    expect(sync.writes).toEqual([{ progress: merged }]);
  });

  it('only writes to the browser when the saved scores already hold everything', async () => {
    const saved = { intuition: result(4, 5, T2) };
    const sync = setup({ profile: row(null, saved), browser: { [PROGRESS_KEY]: JSON.stringify({ intuition: result(3, 5, T1) }) } });
    await sync.engine.start();
    expect(JSON.parse(sync.values.read(PROGRESS_KEY) ?? 'null')).toEqual(saved);
    expect(sync.writes).toEqual([]);
  });

  it('only uploads when the browser scores already hold everything', async () => {
    const browser = { intuition: result(4, 5, T2) };
    const sync = setup({ profile: row(null, {}), browser: { [PROGRESS_KEY]: JSON.stringify(browser) } });
    await sync.engine.start();
    expect(sync.fromAccount).toEqual([]);
    expect(sync.writes).toEqual([{ progress: browser }]);
  });

  it('reads bad saved scores as no scores, so the browser scores win', async () => {
    const browser = { intuition: result(4, 5, T1) };
    const sync = setup({
      profile: row(null, { intuition: 'bad' } as unknown as Progress),
      browser: { [PROGRESS_KEY]: JSON.stringify(browser) },
    });
    await sync.engine.start();
    expect(sync.fromAccount).toEqual([]);
    expect(sync.writes).toEqual([{ progress: browser }]);
  });
});

describe('createSyncEngine, page changes (spec R5b 5)', () => {
  async function started(options: Setup = {}) {
    const sync = setup(options);
    await sync.engine.start();
    return sync;
  }

  it('writes a machine change 2 seconds later, with only the machine columns', async () => {
    const sync = await started();
    sync.values.write(MACHINE_KEY, text(MINE));
    expect(sync.lastStatus()).toBe('saving');
    await vi.advanceTimersByTimeAsync(1999);
    expect(sync.writes).toEqual([]);
    await vi.advanceTimersByTimeAsync(1);
    expect(sync.writes).toEqual([{ machine: JSON.parse(text(MINE)), machineChangedAt: NOW.toISOString() }]);
    expect(sync.record()).toEqual({ userId: USER, machine: text(MINE) });
    expect(sync.lastStatus()).toBe('saved');
  });

  it('sends 3 changes in 2 seconds in 1 write, with the last machine', async () => {
    const sync = await started();
    sync.values.write(MACHINE_KEY, text(OLD));
    await vi.advanceTimersByTimeAsync(500);
    sync.values.write(MACHINE_KEY, text(SAVED));
    await vi.advanceTimersByTimeAsync(500);
    sync.values.write(MACHINE_KEY, text(MINE));
    await vi.advanceTimersByTimeAsync(1000);
    expect(sync.writes).toEqual([{ machine: JSON.parse(text(MINE)), machineChangedAt: NOW.toISOString() }]);
  });

  it('writes a quiz change with only the scores', async () => {
    const sync = await started();
    const scores = { intuition: result(4, 5, NOW.toISOString()) };
    sync.values.write(PROGRESS_KEY, JSON.stringify(scores));
    await vi.advanceTimersByTimeAsync(2000);
    expect(sync.writes).toEqual([{ progress: scores }]);
  });

  it('writes nothing when the machine is back to the one last synced', async () => {
    const sync = await started({ profile: row(MINE), browser: { [MACHINE_KEY]: text(MINE) } });
    sync.values.write(MACHINE_KEY, text(OLD));
    sync.values.write(MACHINE_KEY, text(MINE));
    await vi.advanceTimersByTimeAsync(2000);
    expect(sync.writes).toEqual([]);
    expect(sync.lastStatus()).toBe('saved');
  });

  it('says offline, then tries again after 30 seconds', async () => {
    const sync = await started({ results: ['offline'] });
    sync.values.write(MACHINE_KEY, text(MINE));
    await vi.advanceTimersByTimeAsync(2000);
    expect(sync.lastStatus()).toBe('offline');
    await vi.advanceTimersByTimeAsync(29_999);
    expect(sync.writes).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(sync.writes).toHaveLength(2);
    expect(sync.writes[1]).toEqual(sync.writes[0]);
    expect(sync.lastStatus()).toBe('saved');
  });

  it('tries again at once when the browser is back online', async () => {
    const sync = await started({ results: ['offline'] });
    sync.values.write(PROGRESS_KEY, JSON.stringify({ intuition: result(4, 5, NOW.toISOString()) }));
    await vi.advanceTimersByTimeAsync(2000);
    expect(sync.lastStatus()).toBe('offline');
    sync.online.listener?.();
    await vi.advanceTimersByTimeAsync(0);
    expect(sync.writes).toHaveLength(2);
    expect(sync.lastStatus()).toBe('saved');
    // The online retry cancelled the 30-second one.
    await vi.advanceTimersByTimeAsync(30_000);
    expect(sync.writes).toHaveLength(2);
  });

  it('does not write a machine that is over the size limit, and does not try again', async () => {
    const sync = await started();
    const huge = machine([rule], { name: 'Huge', input: '1'.repeat(262_144) });
    sync.values.write(MACHINE_KEY, text(huge));
    await vi.advanceTimersByTimeAsync(2000);
    expect(sync.writes).toEqual([]);
    expect(sync.lastStatus()).toBe('too-big');
    await vi.advanceTimersByTimeAsync(60_000);
    expect(sync.writes).toEqual([]);
    // The next change that fits is written.
    sync.values.write(MACHINE_KEY, text(MINE));
    await vi.advanceTimersByTimeAsync(2000);
    expect(sync.writes).toHaveLength(1);
    expect(sync.lastStatus()).toBe('saved');
  });

  it('keeps saying too-big after a scores-only write, until a machine write works', async () => {
    const sync = await started();
    sync.values.write(MACHINE_KEY, text(machine([rule], { name: 'Huge', input: '1'.repeat(262_144) })));
    await vi.advanceTimersByTimeAsync(2000);
    const scores = { intuition: result(4, 5, NOW.toISOString()) };
    sync.values.write(PROGRESS_KEY, JSON.stringify(scores));
    await vi.advanceTimersByTimeAsync(2000);
    expect(sync.writes).toEqual([{ progress: scores }]);
    expect(sync.lastStatus()).toBe('too-big');
    sync.values.write(MACHINE_KEY, text(MINE));
    await vi.advanceTimersByTimeAsync(2000);
    expect(sync.lastStatus()).toBe('saved');
  });

  it('keeps saying too-big after the database refused the machine, until a machine write works', async () => {
    const sync = await started({ results: ['too-big'] });
    sync.values.write(MACHINE_KEY, text(MINE));
    await vi.advanceTimersByTimeAsync(2000);
    sync.values.write(PROGRESS_KEY, JSON.stringify({ intuition: result(4, 5, NOW.toISOString()) }));
    await vi.advanceTimersByTimeAsync(2000);
    expect(sync.writes).toHaveLength(2);
    expect(sync.lastStatus()).toBe('too-big');
  });

  it('shows too-big when the database refuses the size, and does not try again', async () => {
    const sync = await started({ results: ['too-big'] });
    sync.values.write(MACHINE_KEY, text(MINE));
    await vi.advanceTimersByTimeAsync(62_000);
    expect(sync.writes).toHaveLength(1);
    expect(sync.lastStatus()).toBe('too-big');
  });

  it('keeps the scores marked as changed after the database refuses a write as too big', async () => {
    const sync = await started({ results: ['too-big'] });
    const scores = { intuition: result(4, 5, NOW.toISOString()) };
    sync.values.write(MACHINE_KEY, text(MINE));
    sync.values.write(PROGRESS_KEY, JSON.stringify(scores));
    await vi.advanceTimersByTimeAsync(2000);
    expect(sync.writes).toHaveLength(1);
    // The next change sends the scores again, with the new machine.
    sync.values.write(MACHINE_KEY, text(OLD));
    await vi.advanceTimersByTimeAsync(2000);
    expect(sync.writes[1]).toEqual({ machine: JSON.parse(text(OLD)), machineChangedAt: NOW.toISOString(), progress: scores });
  });

  it('does not try again when the login is not valid any more', async () => {
    const sync = await started({ results: ['signed-out'] });
    sync.values.write(MACHINE_KEY, text(MINE));
    await vi.advanceTimersByTimeAsync(62_000);
    sync.online.listener?.();
    await vi.advanceTimersByTimeAsync(0);
    expect(sync.writes).toHaveLength(1);
  });

  it('says offline when the first read fails, writes nothing, and starts again after 30 seconds', async () => {
    const sync = setup({ browser: { [MACHINE_KEY]: text(MINE) } });
    sync.client.readProfile.mockRejectedValueOnce(new Error('Failed to fetch'));
    await sync.engine.start();
    expect(sync.lastStatus()).toBe('offline');
    sync.values.write(MACHINE_KEY, text(OLD));
    await vi.advanceTimersByTimeAsync(29_999);
    expect(sync.writes).toEqual([]);
    await vi.advanceTimersByTimeAsync(1);
    expect(sync.client.readProfile).toHaveBeenCalledTimes(2);
    expect(sync.writes).toEqual([{ machine: JSON.parse(text(OLD)), machineChangedAt: NOW.toISOString() }]);
    expect(sync.lastStatus()).toBe('saved');
  });

  it('stops trying when the first read says the login is not valid any more', async () => {
    const sync = setup();
    sync.client.readProfile.mockRejectedValueOnce(new AccountSignedOutError());
    await sync.engine.start();
    sync.online.listener?.();
    await vi.advanceTimersByTimeAsync(90_000);
    expect(sync.client.readProfile).toHaveBeenCalledOnce();
    expect(sync.lastStatus()).toBe('offline');
  });

  it('stops: the pending write is cancelled and later changes are ignored', async () => {
    const sync = await started();
    sync.values.write(MACHINE_KEY, text(MINE));
    sync.engine.stop();
    await vi.advanceTimersByTimeAsync(5000);
    sync.values.write(PROGRESS_KEY, JSON.stringify({ intuition: result(4, 5, NOW.toISOString()) }));
    await vi.advanceTimersByTimeAsync(5000);
    expect(sync.writes).toEqual([]);
    expect(sync.online.listener).toBeNull();
  });

  it('does not upload machine changes while the question is open, but still uploads quiz changes', async () => {
    const sync = await started({ profile: row(SAVED), browser: { [MACHINE_KEY]: text(MINE) } });
    const scores = { intuition: result(4, 5, NOW.toISOString()) };
    sync.values.write(MACHINE_KEY, text(OLD));
    sync.values.write(PROGRESS_KEY, JSON.stringify(scores));
    await vi.advanceTimersByTimeAsync(2000);
    expect(sync.writes).toEqual([{ progress: scores }]);
  });
});

describe('createSyncEngine, a second device wrote between page loads (spec R5b 5)', () => {
  async function startedWithOld() {
    const sync = setup({
      profile: row(OLD),
      browser: { [MACHINE_KEY]: text(OLD), [SYNC_KEY]: JSON.stringify({ userId: USER, machine: text(OLD) }) },
    });
    await sync.engine.start();
    return sync;
  }

  it('asks instead of writing over a machine that another device saved', async () => {
    const sync = await startedWithOld();
    sync.otherDeviceWrites(row(SAVED));
    sync.values.write(MACHINE_KEY, text(MINE));
    await vi.advanceTimersByTimeAsync(2000);
    expect(sync.writes).toEqual([]);
    expect(sync.conflicts.at(-1)).toEqual({
      browser: { name: 'Mine', changedAt: NOW.toISOString() },
      saved: { name: 'Saved one', changedAt: '2026-11-24T18:30:00.000Z' },
    });
    // "Keep this browser's machine" writes it after all.
    await sync.engine.keepBrowserMachine();
    expect(sync.writes).toEqual([{ machine: JSON.parse(text(MINE)), machineChangedAt: NOW.toISOString() }]);
  });

  it('asks when the retry after a lost connection finds a machine from another device', async () => {
    const sync = setup({
      profile: row(OLD),
      results: ['offline'],
      browser: { [MACHINE_KEY]: text(OLD), [SYNC_KEY]: JSON.stringify({ userId: USER, machine: text(OLD) }) },
    });
    await sync.engine.start();
    sync.values.write(MACHINE_KEY, text(MINE));
    await vi.advanceTimersByTimeAsync(2000);
    expect(sync.lastStatus()).toBe('offline');
    sync.otherDeviceWrites(row(SAVED));
    await vi.advanceTimersByTimeAsync(30_000);
    expect(sync.writes).toHaveLength(1);
    expect(sync.conflicts.at(-1)).toMatchObject({ saved: { name: 'Saved one' } });
  });

  it('merges the scores that another device saved before it writes, and gives the browser the merge', async () => {
    const sync = await startedWithOld();
    const other = { busyBeaver: result(2, 3, '2026-11-24T20:00:00.000Z') };
    sync.otherDeviceWrites(row(OLD, other));
    const mine = { intuition: result(4, 5, NOW.toISOString()) };
    sync.values.write(PROGRESS_KEY, JSON.stringify(mine));
    await vi.advanceTimersByTimeAsync(2000);
    expect(sync.writes).toEqual([{ progress: { ...mine, ...other } }]);
    expect(JSON.parse(sync.values.read(PROGRESS_KEY) ?? 'null')).toEqual({ ...mine, ...other });
    expect(sync.fromAccount).toEqual([PROGRESS_KEY]);
  });

  it('says offline and tries again when the read before a write fails', async () => {
    const sync = await startedWithOld();
    sync.client.readProfile.mockRejectedValueOnce(new Error('Failed to fetch'));
    sync.values.write(MACHINE_KEY, text(MINE));
    await vi.advanceTimersByTimeAsync(2000);
    expect(sync.writes).toEqual([]);
    expect(sync.lastStatus()).toBe('offline');
    await vi.advanceTimersByTimeAsync(30_000);
    expect(sync.writes).toHaveLength(1);
    expect(sync.lastStatus()).toBe('saved');
  });
});
