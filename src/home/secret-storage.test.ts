import { describe, expect, it } from 'vitest';
import { blockedStorage, fakeStorage } from '@/test/fake-storage';
import { createBrowserSecretStorage, parseSecret, SECRET_KEY, type SavedSecret } from './secret-storage';

const SECRET: SavedSecret = {
  plain: 'Wetterbericht',
  cipher: 'PBJGOLIZQMQGZ',
  settings: { rotors: ['I', 'II', 'III'], rings: ['A', 'A', 'A'], reflector: 'B', plugs: ['AV', 'BS'] },
  start: ['B', 'L', 'A'],
};

describe('createBrowserSecretStorage (spec R3 4: the secret stays in the browser)', () => {
  it('saves the plain text, the secret letters and the settings, and loads them back', () => {
    const backing = fakeStorage();
    createBrowserSecretStorage(() => backing).save(SECRET);
    expect(JSON.parse(backing.getItem(SECRET_KEY) ?? 'null')).toEqual(SECRET);
    expect(createBrowserSecretStorage(() => backing).load()).toEqual(SECRET);
  });

  it('forgets the secret', () => {
    const backing = fakeStorage();
    const storage = createBrowserSecretStorage(() => backing);
    storage.save(SECRET);
    storage.forget();
    expect(backing.getItem(SECRET_KEY)).toBeNull();
    expect(storage.load()).toBeNull();
  });

  it('keeps the secret in memory when the browser blocks storage', () => {
    const storage = createBrowserSecretStorage(() => blockedStorage());
    storage.save(SECRET);
    expect(storage.persistent).toBe(false);
    expect(storage.load()).toEqual(SECRET);
  });
});

describe('parseSecret', () => {
  it('reads nothing saved, broken JSON and a wrong shape as no secret', () => {
    expect(parseSecret(null)).toBeNull();
    expect(parseSecret('{oops')).toBeNull();
    expect(parseSecret(JSON.stringify({ ...SECRET, start: ['B', 'L'] }))).toBeNull();
    expect(parseSecret(JSON.stringify({ ...SECRET, settings: { ...SECRET.settings, rotors: ['I', 'II', 'IX'] } }))).toBeNull();
  });
});
