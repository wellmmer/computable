// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PRACTICE } from '@/bombe/practice-message';
import { encrypt } from '@/engines/enigma';
import type { SecretKey } from './random-key';
import { SECRET_KEY } from './secret-storage';
import { forgetSecret, saveSecret, useSecret } from './use-secret';

afterEach(() => {
  cleanup();
  forgetSecret();
});

/** The key every secret got before R4b: the lab's first settings. */
const R3_KEY: SecretKey = {
  settings: { rotors: ['I', 'II', 'III'], rings: ['A', 'A', 'A'], reflector: 'B', plugs: ['AV', 'BS', 'CG', 'DL', 'FU', 'HZ', 'IN', 'KM', 'OW', 'RX'] },
  start: ['B', 'L', 'A'],
};
const PRACTICE_KEY: SecretKey = { settings: PRACTICE.settings, start: PRACTICE.start };

describe('useSecret', () => {
  it('reads the secret that the browser kept from an earlier visit', async () => {
    saveSecret('Hallo');
    // A fresh copy of the module, as on a new page load: the module keeps what it read once.
    vi.resetModules();
    const fresh = await import('./use-secret');
    const { result } = renderHook(() => fresh.useSecret());
    expect(result.current?.plain).toBe('Hallo');
    fresh.forgetSecret();
  });

  it('is undefined on the server, which cannot see the browser storage', () => {
    function Status() {
      return <p>{useSecret() === undefined ? 'unknown' : 'known'}</p>;
    }
    expect(renderToString(<Status />)).toBe('<p>unknown</p>');
  });

  it('saves the plain text, the secret letters and the key at once', () => {
    const { result } = renderHook(() => useSecret());
    act(() => void saveSecret('Wetterbericht', () => R3_KEY));
    expect(result.current).toEqual({ plain: 'Wetterbericht', cipher: 'PBJGOLIZQMQGZ', ...R3_KEY });
    expect(JSON.parse(localStorage.getItem(SECRET_KEY) ?? 'null')).toEqual(result.current);
  });

  it('draws a key for a new secret, and keeps it while the visitor types more (spec R4 4)', () => {
    const draw = vi.fn(() => PRACTICE_KEY);
    const short = saveSecret('Wetter', draw);
    const long = saveSecret('Wetterbericht', draw);
    expect(draw).toHaveBeenCalledTimes(1);
    expect(long).toMatchObject({ ...PRACTICE_KEY, cipher: 'HXHICIRWHZRQW' });
    // The same key, so the secret letters typed so far never change.
    expect(long?.cipher.startsWith(short?.cipher ?? '?')).toBe(true);
  });

  it('draws a new key after "Forget my secret", and after the visitor erased the whole text', () => {
    const draw = vi.fn().mockReturnValueOnce(R3_KEY).mockReturnValueOnce(PRACTICE_KEY).mockReturnValueOnce(R3_KEY);
    saveSecret('Hallo', draw);
    forgetSecret();
    expect(saveSecret('Hallo', draw)).toMatchObject(PRACTICE_KEY);
    expect(saveSecret('', draw)).toBeNull();
    expect(saveSecret('Hallo', draw)).toMatchObject(R3_KEY);
    expect(draw).toHaveBeenCalledTimes(3);
  });

  it('keeps the key of a secret saved before R4b, so its secret letters still decrypt', () => {
    const before = { plain: 'Hallo', cipher: encrypt(R3_KEY.settings, R3_KEY.start, 'HALLO'), ...R3_KEY };
    localStorage.setItem(SECRET_KEY, JSON.stringify(before));
    const { result } = renderHook(() => useSecret());
    expect(result.current).toEqual(before);
    const draw = vi.fn(() => PRACTICE_KEY);
    act(() => void saveSecret('Hallo Welt', draw));
    expect(draw).not.toHaveBeenCalled();
    expect(result.current).toEqual({ plain: 'Hallo Welt', cipher: encrypt(R3_KEY.settings, R3_KEY.start, 'HALLOXWELT'), ...R3_KEY });
  });

  it('forgets the secret, and an empty text saves nothing', () => {
    const { result } = renderHook(() => useSecret());
    act(() => void saveSecret('Hallo'));
    act(() => forgetSecret());
    expect(result.current).toBeNull();
    expect(localStorage.getItem(SECRET_KEY)).toBeNull();
    act(() => void saveSecret(''));
    expect(localStorage.getItem(SECRET_KEY)).toBeNull();
  });

  it('reads the secret again when a page starts to listen, so a change made while no page listened shows', () => {
    const first = renderHook(() => useSecret());
    expect(first.result.current).toBeNull();
    first.unmount();
    const value = JSON.stringify({ plain: 'A', cipher: 'B', settings: { rotors: ['I', 'II', 'III'], rings: ['A', 'A', 'A'], reflector: 'B', plugs: [] }, start: ['A', 'A', 'A'] });
    localStorage.setItem(SECRET_KEY, value);
    const { result } = renderHook(() => useSecret());
    expect(result.current?.plain).toBe('A');
  });

  it('shows a secret that another tab saved', () => {
    const { result } = renderHook(() => useSecret());
    const value = JSON.stringify({ plain: 'A', cipher: 'B', settings: { rotors: ['I', 'II', 'III'], rings: ['A', 'A', 'A'], reflector: 'B', plugs: [] }, start: ['A', 'A', 'A'] });
    localStorage.setItem(SECRET_KEY, value);
    act(() => window.dispatchEvent(new StorageEvent('storage', { key: SECRET_KEY, newValue: value })));
    expect(result.current?.plain).toBe('A');
  });
});
