import { describe, expect, it, vi } from 'vitest';
import { serializeMachine } from '@/engines/turing';
import { machine } from '@/engines/turing/test-helpers';
import { blockedStorage, fakeStorage } from '@/test/fake-storage';
import { createKeyValue } from './key-value';
import { PROGRESS_KEY } from './keys';
import { createBrowserStorage, createMemoryStorage, createSyncedStorage, MACHINE_KEY } from './machine-storage';
import { createSyncedKeyValue } from './synced-key-value';

const binary = machine([{ state: 'q0', read: '1', write: '0', move: 'R', next: 'qA' }], { name: 'Mine', input: '1' });

describe('createBrowserStorage', () => {
  it('saves a machine and loads it back', () => {
    const backing = fakeStorage();
    createBrowserStorage(() => backing).saveMachine(binary);
    const again = createBrowserStorage(() => backing);
    expect(again.persistent).toBe(true);
    expect(again.loadMachine()).toEqual(binary);
  });

  it('loads nothing when the saved text is not a machine', () => {
    const backing = fakeStorage();
    backing.setItem(MACHINE_KEY, '{"format":"something else"}');
    expect(createBrowserStorage(() => backing).loadMachine()).toBeNull();
  });

  it('remembers that a note was seen', () => {
    const backing = fakeStorage();
    createBrowserStorage(() => backing).markSeen('left-edge');
    expect(createBrowserStorage(() => backing).hasSeen('left-edge')).toBe(true);
  });

  it('keeps working in memory when the browser blocks writes', () => {
    const storage = createBrowserStorage(() => blockedStorage());
    expect(storage.persistent).toBe(false);
    storage.saveMachine(binary);
    expect(storage.loadMachine()).toEqual(binary);
  });

  it('keeps working in memory when reading localStorage itself throws', () => {
    const storage = createBrowserStorage(() => {
      throw new DOMException('denied', 'SecurityError');
    });
    expect(storage.persistent).toBe(false);
    storage.markSeen('left-edge');
    expect(storage.hasSeen('left-edge')).toBe(true);
  });

  it('switches to memory when a later write fails, for example when storage is full', () => {
    const backing = fakeStorage();
    const storage = createBrowserStorage(() => backing);
    backing.setItem = () => {
      throw new DOMException('full', 'QuotaExceededError');
    };
    storage.saveMachine(binary);
    expect(storage.persistent).toBe(false);
    expect(storage.loadMachine()).toEqual(binary);
  });
});

describe('createMemoryStorage', () => {
  it('starts empty and is not persistent', () => {
    const storage = createMemoryStorage();
    expect(storage.persistent).toBe(false);
    expect(storage.loadMachine()).toBeNull();
    expect(storage.hasSeen('left-edge')).toBe(false);
  });
});

describe('MachineStorage.onMachineFromAccount (spec R5b 5)', () => {
  it('gives the machine that the sync wrote from the account', () => {
    const values = createSyncedKeyValue(createKeyValue(null));
    const storage = createSyncedStorage(values);
    const listener = vi.fn();
    storage.onMachineFromAccount(listener);
    values.writeFromAccount(MACHINE_KEY, serializeMachine(binary));
    expect(listener).toHaveBeenCalledExactlyOnceWith(binary);
  });

  it('gives nothing for unreadable text, for the quiz scores, or after the stop function ran', () => {
    const values = createSyncedKeyValue(createKeyValue(null));
    const storage = createSyncedStorage(values);
    const listener = vi.fn();
    const stop = storage.onMachineFromAccount(listener);
    values.writeFromAccount(MACHINE_KEY, '{"format":"something else"}');
    values.writeFromAccount(PROGRESS_KEY, '{}');
    stop();
    values.writeFromAccount(MACHINE_KEY, serializeMachine(binary));
    expect(listener).not.toHaveBeenCalled();
  });

  it('never calls from memory storage, which has no account', () => {
    const listener = vi.fn();
    createMemoryStorage().onMachineFromAccount(listener)();
    expect(listener).not.toHaveBeenCalled();
  });
});
