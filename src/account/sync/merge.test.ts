import { describe, expect, it } from 'vitest';
import { serializeMachine } from '@/engines/turing';
import { machine } from '@/engines/turing/test-helpers';
import type { Progress } from '@/learn/progress-storage';
import { canonicalMachine, decideMachine, mergeProgress, sameProgress } from './merge';

const MINE = machine([{ state: 'q0', read: '1', write: '0', move: 'R', next: 'qA' }], { name: 'Mine' });
const TEXT = serializeMachine(MINE);

describe('canonicalMachine (spec R5b 5)', () => {
  it('gives the same text whatever the key order, because jsonb does not keep it', () => {
    const reordered = JSON.stringify(Object.fromEntries(Object.entries(MINE).reverse()));
    expect(canonicalMachine(reordered)).toBe(TEXT);
    expect(canonicalMachine(TEXT)).toBe(TEXT);
  });

  it('gives null for missing or unreadable text', () => {
    expect(canonicalMachine(null)).toBeNull();
    expect(canonicalMachine('not json')).toBeNull();
    expect(canonicalMachine('{"format":"something else"}')).toBeNull();
  });
});

describe('decideMachine (spec R5b 5)', () => {
  const A = 'machine A';
  const B = 'machine B';
  const C = 'machine C';

  it.each([
    ['no machine on either side', null, null, null, 'nothing'],
    ['no machine on either side, after an earlier sync', null, null, A, 'nothing'],
    ['no saved machine: the browser machine goes up', A, null, null, 'upload-browser'],
    ['no saved machine, and the browser machine did not change since the last sync', A, null, A, 'nothing'],
    ['no saved machine, and the browser machine changed since the last sync', B, null, A, 'upload-browser'],
    ['the same machine on both sides', A, A, null, 'record'],
    ['the same machine on both sides after other syncs', A, A, B, 'record'],
    ['no browser machine: the saved one comes down', null, A, null, 'take-saved'],
    ['the browser machine did not change since the last sync', A, B, A, 'take-saved'],
    ['the saved machine did not change since the last sync', B, A, A, 'upload-browser'],
    ['both changed since the last sync', B, C, A, 'ask'],
    ['both exist and nothing was synced yet', A, B, null, 'ask'],
  ] as const)('%s', (_name, browser, saved, lastSynced, decision) => {
    expect(decideMachine(browser, saved, lastSynced)).toBe(decision);
  });
});

describe('mergeProgress (spec R5b 5)', () => {
  const result = (best: number, total: number, finishedAt: string) => ({ best, total, finishedAt });

  it('keeps the higher best and the later time when the quiz has the same number of questions', () => {
    const browser: Progress = { intuition: result(4, 5, '2026-11-20T10:00:00.000Z') };
    const saved: Progress = { intuition: result(2, 5, '2026-11-22T10:00:00.000Z') };
    expect(mergeProgress(browser, saved)).toEqual({ intuition: result(4, 5, '2026-11-22T10:00:00.000Z') });
    expect(mergeProgress(saved, browser)).toEqual({ intuition: result(4, 5, '2026-11-22T10:00:00.000Z') });
  });

  it('keeps the later result when the quiz has another number of questions', () => {
    const older: Progress = { intuition: result(5, 5, '2026-11-20T10:00:00.000Z') };
    const newer: Progress = { intuition: result(3, 6, '2026-11-22T10:00:00.000Z') };
    expect(mergeProgress(older, newer)).toEqual(newer);
    expect(mergeProgress(newer, older)).toEqual(newer);
  });

  it('keeps the lessons that only one side has', () => {
    const browser: Progress = { intuition: result(4, 5, '2026-11-20T10:00:00.000Z') };
    const saved: Progress = { busyBeaver: result(1, 3, '2026-11-21T10:00:00.000Z') };
    expect(mergeProgress(browser, saved)).toEqual({ ...browser, ...saved });
  });

  it('does not change its inputs', () => {
    const browser: Progress = { intuition: result(4, 5, '2026-11-20T10:00:00.000Z') };
    const saved: Progress = { intuition: result(2, 5, '2026-11-22T10:00:00.000Z'), other: result(1, 1, '2026-11-22T10:00:00.000Z') };
    const before = structuredClone({ browser, saved });
    mergeProgress(browser, saved);
    expect({ browser, saved }).toEqual(before);
  });
});

describe('mergeProgress after "Reset my progress" (spec R5b 5)', () => {
  const result = (best: number, total: number, finishedAt: string) => ({ best, total, finishedAt });

  it('drops the results that ended before the newest reset, on both sides', () => {
    const browser: Progress = { a: result(1, 2, '2026-11-20T10:00:00.000Z'), b: result(2, 2, '2026-11-23T10:00:00.000Z') };
    const saved: Progress = { c: result(1, 1, '2026-11-21T10:00:00.000Z'), d: result(1, 1, '2026-11-24T10:00:00.000Z') };
    expect(mergeProgress(browser, saved, '2026-11-22T00:00:00.000Z')).toEqual({ b: browser.b, d: saved.d });
  });

  it('keeps everything without a reset', () => {
    const browser: Progress = { a: result(1, 2, '2026-11-20T10:00:00.000Z') };
    expect(mergeProgress(browser, {}, null)).toEqual(browser);
  });
});

describe('sameProgress', () => {
  it('ignores the order of the lessons', () => {
    const one = { best: 1, total: 2, finishedAt: '2026-11-20T10:00:00.000Z' };
    const two = { best: 2, total: 2, finishedAt: '2026-11-21T10:00:00.000Z' };
    expect(sameProgress({ a: one, b: two }, { b: two, a: one })).toBe(true);
    expect(sameProgress({ a: one }, { a: two })).toBe(false);
    expect(sameProgress({ a: one }, { a: one, b: two })).toBe(false);
    expect(sameProgress({}, {})).toBe(true);
  });
});
