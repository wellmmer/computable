// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { resetProgress, saveQuizResult, useProgress } from './progress';
import { sharedBrowserValues } from '@/storage/synced-key-value';
import { PROGRESS_KEY } from './progress-storage';

afterEach(() => {
  cleanup();
  resetProgress();
  vi.useRealTimers();
});

describe('useProgress', () => {
  it('reads the results that the browser kept from an earlier visit', async () => {
    localStorage.setItem(PROGRESS_KEY, '{"intuition":{"best":3,"total":5,"finishedAt":"2026-11-15T08:00:00.000Z"}}');
    // A fresh copy of the module, as on a new page load: the module keeps what it read once.
    vi.resetModules();
    const fresh = await import('./progress');
    const { result } = renderHook(() => fresh.useProgress());
    expect(result.current).toEqual({ intuition: { best: 3, total: 5, finishedAt: '2026-11-15T08:00:00.000Z' } });
    fresh.resetProgress();
  });

  it('is null on the server, which cannot see the browser storage', () => {
    function Status() {
      return <p>{useProgress() === null ? 'unknown' : 'known'}</p>;
    }
    expect(renderToString(<Status />)).toBe('<p>unknown</p>');
  });

  it('shows a saved quiz result at once, and saves it in the browser', () => {
    vi.useFakeTimers({ now: new Date('2026-11-16T10:00:00.000Z') });
    const { result } = renderHook(() => useProgress());
    expect(result.current).toEqual({});
    act(() => saveQuizResult('intuition', 4, 5));
    expect(result.current).toEqual({ intuition: { best: 4, total: 5, finishedAt: '2026-11-16T10:00:00.000Z' } });
    expect(JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? 'null')).toEqual(result.current);
  });

  it('forgets every result on reset', () => {
    const { result } = renderHook(() => useProgress());
    act(() => saveQuizResult('intuition', 4, 5));
    act(() => resetProgress());
    expect(result.current).toEqual({});
    expect(localStorage.getItem(PROGRESS_KEY)).toBeNull();
  });

  it('shows a result that another tab saved', () => {
    const { result } = renderHook(() => useProgress());
    expect(result.current).toEqual({});
    const saved = '{"intuition":{"best":5,"total":5,"finishedAt":"2026-11-16T11:00:00.000Z"}}';
    // Another tab writes to localStorage. This tab only hears the storage event.
    localStorage.setItem(PROGRESS_KEY, saved);
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: PROGRESS_KEY, newValue: saved, storageArea: localStorage }));
    });
    expect(result.current).toEqual({ intuition: { best: 5, total: 5, finishedAt: '2026-11-16T11:00:00.000Z' } });
  });

  it('shows no results after another tab resets the progress', () => {
    const { result } = renderHook(() => useProgress());
    act(() => saveQuizResult('intuition', 4, 5));
    localStorage.removeItem(PROGRESS_KEY);
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: PROGRESS_KEY, newValue: null, storageArea: localStorage }));
    });
    expect(result.current).toEqual({});
  });

  it('ignores storage events for other keys', () => {
    const { result } = renderHook(() => useProgress());
    act(() => saveQuizResult('intuition', 4, 5));
    const before = result.current;
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: 'computable.machine', newValue: '{}', storageArea: localStorage }));
    });
    expect(result.current).toBe(before);
  });

  it('shows the scores that the sync wrote from the account (spec R5b 5)', () => {
    const { result } = renderHook(() => useProgress());
    expect(result.current).toEqual({});
    act(() => {
      sharedBrowserValues().writeFromAccount(PROGRESS_KEY, '{"intuition":{"best":2,"total":5,"finishedAt":"2026-11-24T09:00:00.000Z"}}');
    });
    expect(result.current).toEqual({ intuition: { best: 2, total: 5, finishedAt: '2026-11-24T09:00:00.000Z' } });
  });
});
