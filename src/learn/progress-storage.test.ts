import { describe, expect, it } from 'vitest';
import { blockedStorage, fakeStorage } from '@/test/fake-storage';
import { createBrowserProgressStorage, parseProgress, PROGRESS_KEY } from './progress-storage';

const MONDAY = new Date('2026-11-16T10:00:00.000Z');
const TUESDAY = new Date('2026-11-17T09:30:00.000Z');

describe('createBrowserProgressStorage (spec 4)', () => {
  it('saves a finished quiz and loads it back', () => {
    const backing = fakeStorage();
    createBrowserProgressStorage(() => backing).saveResult('intuition', 4, 5, MONDAY);
    const again = createBrowserProgressStorage(() => backing);
    expect(again.persistent).toBe(true);
    expect(again.load()).toEqual({ intuition: { best: 4, total: 5, finishedAt: '2026-11-16T10:00:00.000Z' } });
  });

  it('keeps the best score, and the date of the last finished quiz', () => {
    const storage = createBrowserProgressStorage(() => fakeStorage());
    storage.saveResult('intuition', 4, 5, MONDAY);
    expect(storage.saveResult('intuition', 2, 5, TUESDAY)).toEqual({
      intuition: { best: 4, total: 5, finishedAt: '2026-11-17T09:30:00.000Z' },
    });
  });

  it('starts a new best score when the quiz has a new number of questions', () => {
    const storage = createBrowserProgressStorage(() => fakeStorage());
    storage.saveResult('intuition', 4, 4, MONDAY);
    expect(storage.saveResult('intuition', 3, 5, TUESDAY).intuition).toEqual({ best: 3, total: 5, finishedAt: '2026-11-17T09:30:00.000Z' });
  });

  it('keeps each lesson apart', () => {
    const storage = createBrowserProgressStorage(() => fakeStorage());
    storage.saveResult('intuition', 4, 5, MONDAY);
    storage.saveResult('formal-definition', 5, 5, TUESDAY);
    expect(Object.keys(storage.load())).toEqual(['intuition', 'formal-definition']);
  });

  it('forgets every result on reset', () => {
    const backing = fakeStorage();
    const storage = createBrowserProgressStorage(() => backing);
    storage.saveResult('intuition', 4, 5, MONDAY);
    storage.reset();
    expect(storage.load()).toEqual({});
    expect(backing.getItem(PROGRESS_KEY)).toBeNull();
  });

  it('keeps working in memory when the browser blocks storage', () => {
    const storage = createBrowserProgressStorage(() => blockedStorage());
    expect(storage.persistent).toBe(false);
    storage.saveResult('intuition', 4, 5, MONDAY);
    expect(storage.load().intuition?.best).toBe(4);
    storage.reset();
    expect(storage.load()).toEqual({});
  });

  it('keeps working in memory when reading localStorage itself throws', () => {
    const storage = createBrowserProgressStorage(() => {
      throw new DOMException('denied', 'SecurityError');
    });
    expect(storage.persistent).toBe(false);
    expect(storage.saveResult('intuition', 1, 5, MONDAY).intuition?.best).toBe(1);
  });
});

describe('parseProgress: data that does not parse reads as no progress (spec 4)', () => {
  it.each([
    ['nothing saved', null],
    ['not JSON', '{"intuition":'],
    ['not an object', '[1,2]'],
    ['a missing field', '{"intuition":{"best":4,"total":5}}'],
    ['a score above the number of questions', '{"intuition":{"best":6,"total":5,"finishedAt":"2026-11-16T10:00:00.000Z"}}'],
    ['a negative score', '{"intuition":{"best":-1,"total":5,"finishedAt":"2026-11-16T10:00:00.000Z"}}'],
    ['a score that is not a whole number', '{"intuition":{"best":2.5,"total":5,"finishedAt":"2026-11-16T10:00:00.000Z"}}'],
    ['a date that is not a date', '{"intuition":{"best":4,"total":5,"finishedAt":"Monday"}}'],
  ])('%s', (_, text) => {
    expect(parseProgress(text)).toEqual({});
  });

  it('reads a good result', () => {
    expect(parseProgress('{"intuition":{"best":0,"total":5,"finishedAt":"2026-11-16T10:00:00.000Z"}}')).toEqual({
      intuition: { best: 0, total: 5, finishedAt: '2026-11-16T10:00:00.000Z' },
    });
  });
});
