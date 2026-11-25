import { describe, expect, it, vi } from 'vitest';
import { createKeyValue } from './key-value';
import { MACHINE_CHANGED_AT_KEY, MACHINE_KEY, PROGRESS_KEY } from './keys';
import { createSyncedKeyValue } from './synced-key-value';

const NOW = new Date('2026-11-25T10:00:00.000Z');

function setup() {
  const inner = createKeyValue(null);
  const values = createSyncedKeyValue(inner, () => NOW);
  const local = vi.fn();
  const account = vi.fn();
  values.onLocalChange(local);
  values.onAccountChange(account);
  return { inner, values, local, account };
}

describe('createSyncedKeyValue (spec R5b 5)', () => {
  it('reads, writes and removes through the inner values, and keeps their persistent flag', () => {
    const { inner, values } = setup();
    values.write('computable.seen.left-edge', '1');
    expect(inner.read('computable.seen.left-edge')).toBe('1');
    inner.write('computable.other', 'x');
    expect(values.read('computable.other')).toBe('x');
    values.remove('computable.other');
    expect(inner.read('computable.other')).toBeNull();
    expect(values.persistent).toBe(false);
  });

  it('records when the page changed the machine, then tells the local listeners', () => {
    const { inner, values, local, account } = setup();
    local.mockImplementation(() => expect(inner.read(MACHINE_CHANGED_AT_KEY)).toBe('2026-11-25T10:00:00.000Z'));
    values.write(MACHINE_KEY, '{"name":"A"}');
    expect(inner.read(MACHINE_KEY)).toBe('{"name":"A"}');
    expect(local).toHaveBeenCalledExactlyOnceWith(MACHINE_KEY);
    expect(account).not.toHaveBeenCalled();
  });

  it('tells the local listeners when the page writes or removes the quiz scores', () => {
    const { values, local } = setup();
    values.write(PROGRESS_KEY, '{}');
    values.remove(PROGRESS_KEY);
    expect(local.mock.calls).toEqual([[PROGRESS_KEY], [PROGRESS_KEY]]);
  });

  it('tells no one about other keys', () => {
    const { values, local, account } = setup();
    values.write('computable.seen.left-edge', '1');
    values.remove('computable.seen.left-edge');
    expect(local).not.toHaveBeenCalled();
    expect(account).not.toHaveBeenCalled();
  });

  it('tells no one, and keeps the time, when the page writes the text that is already there', () => {
    // The simulator saves the machine again after it loads it. That is not a change.
    const { inner, values, local } = setup();
    inner.write(MACHINE_KEY, '{"name":"A"}');
    inner.write(MACHINE_CHANGED_AT_KEY, '2026-11-20T08:00:00.000Z');
    values.write(MACHINE_KEY, '{"name":"A"}');
    expect(local).not.toHaveBeenCalled();
    expect(inner.read(MACHINE_CHANGED_AT_KEY)).toBe('2026-11-20T08:00:00.000Z');
  });

  it('writes a value from the account with its time, and tells only the account listeners', () => {
    const { inner, values, local, account } = setup();
    values.writeFromAccount(MACHINE_KEY, '{"name":"Saved"}', '2026-11-24T18:30:00.000Z');
    expect(inner.read(MACHINE_KEY)).toBe('{"name":"Saved"}');
    expect(inner.read(MACHINE_CHANGED_AT_KEY)).toBe('2026-11-24T18:30:00.000Z');
    expect(account).toHaveBeenCalledExactlyOnceWith(MACHINE_KEY);
    expect(local).not.toHaveBeenCalled();
  });

  it('removes the machine time when the account gives none', () => {
    const { inner, values } = setup();
    inner.write(MACHINE_CHANGED_AT_KEY, '2026-11-20T08:00:00.000Z');
    values.writeFromAccount(MACHINE_KEY, '{"name":"Saved"}');
    expect(inner.read(MACHINE_CHANGED_AT_KEY)).toBeNull();
  });

  it('writes quiz scores from the account without a time', () => {
    const { inner, values, account } = setup();
    values.writeFromAccount(PROGRESS_KEY, '{}');
    expect(inner.read(PROGRESS_KEY)).toBe('{}');
    expect(inner.read(MACHINE_CHANGED_AT_KEY)).toBeNull();
    expect(account).toHaveBeenCalledExactlyOnceWith(PROGRESS_KEY);
  });

  it('stops calling a listener after the function it returned runs', () => {
    const values = createSyncedKeyValue(createKeyValue(null), () => NOW);
    const local = vi.fn();
    const account = vi.fn();
    const stopLocal = values.onLocalChange(local);
    const stopAccount = values.onAccountChange(account);
    stopLocal();
    stopAccount();
    values.write(PROGRESS_KEY, '{}');
    values.writeFromAccount(PROGRESS_KEY, '{"a":1}');
    expect(local).not.toHaveBeenCalled();
    expect(account).not.toHaveBeenCalled();
  });
});

describe('sharedBrowserValues', () => {
  it('gives the same values to every caller on the page', async () => {
    const { sharedBrowserValues } = await import('./synced-key-value');
    expect(sharedBrowserValues()).toBe(sharedBrowserValues());
  });
});
