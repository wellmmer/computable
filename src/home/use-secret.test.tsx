// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SECRET_KEY } from './secret-storage';
import { forgetSecret, saveSecret, useSecret } from './use-secret';

afterEach(() => {
  cleanup();
  forgetSecret();
});

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

  it('saves the plain text, the secret letters and the settings at once', () => {
    const { result } = renderHook(() => useSecret());
    act(() => saveSecret('Wetterbericht'));
    expect(result.current).toEqual({
      plain: 'Wetterbericht',
      cipher: 'PBJGOLIZQMQGZ',
      settings: { rotors: ['I', 'II', 'III'], rings: ['A', 'A', 'A'], reflector: 'B', plugs: ['AV', 'BS', 'CG', 'DL', 'FU', 'HZ', 'IN', 'KM', 'OW', 'RX'] },
      start: ['B', 'L', 'A'],
    });
    expect(JSON.parse(localStorage.getItem(SECRET_KEY) ?? 'null')).toEqual(result.current);
  });

  it('forgets the secret, and an empty text saves nothing', () => {
    const { result } = renderHook(() => useSecret());
    act(() => saveSecret('Hallo'));
    act(() => forgetSecret());
    expect(result.current).toBeNull();
    expect(localStorage.getItem(SECRET_KEY)).toBeNull();
    act(() => saveSecret(''));
    expect(localStorage.getItem(SECRET_KEY)).toBeNull();
  });

  it('shows a secret that another tab saved', () => {
    const { result } = renderHook(() => useSecret());
    const value = JSON.stringify({ plain: 'A', cipher: 'B', settings: { rotors: ['I', 'II', 'III'], rings: ['A', 'A', 'A'], reflector: 'B', plugs: [] }, start: ['A', 'A', 'A'] });
    localStorage.setItem(SECRET_KEY, value);
    act(() => window.dispatchEvent(new StorageEvent('storage', { key: SECRET_KEY, newValue: value })));
    expect(result.current?.plain).toBe('A');
  });
});
