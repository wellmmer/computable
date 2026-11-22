import { describe, expect, it } from 'vitest';
import { PRACTICE } from './practice-message';
import { LISTED_STOPS, runSearch } from './run-search';
import type { SearchReport } from './search-messages';

function reportsOf(request: Parameters<typeof runSearch>[0]): SearchReport[] {
  const reports: SearchReport[] = [];
  runSearch(request, (report) => reports.push(report));
  return reports;
}

describe('runSearch (spec R4 2, "Search": the worker\'s work)', () => {
  it('reports the start under test 8 times for each order, then the order\'s stops, then the end', () => {
    const reports = reportsOf({ cipher: PRACTICE.cipher, crib: PRACTICE.crib, offset: 0, orders: [['II', 'III', 'V'], ['I', 'II', 'III']] });
    const testing = reports.filter((report) => report.type === 'testing');
    expect(testing).toHaveLength(16);
    expect(testing[0]).toEqual({ type: 'testing', order: 0, start: 0 });
    expect(testing[8]).toEqual({ type: 'testing', order: 1, start: 0 });
    expect(reports.filter((report) => report.type !== 'testing')).toEqual([
      { type: 'order-done', order: 0, stops: [{ rotors: ['II', 'III', 'V'], start: ['Q', 'K', 'A'], plugs: ['AH', 'BP', 'EX', 'KW', 'MR', 'NT', 'VZ'] }], count: 1 },
      { type: 'order-done', order: 1, stops: [], count: 0 },
      { type: 'finished' },
    ]);
  });

  it(`lists at most ${LISTED_STOPS} stops, and counts them all`, () => {
    // A 3-letter crib without a loop stops almost everywhere.
    const reports = reportsOf({ cipher: PRACTICE.cipher, crib: 'WET', offset: 0, orders: [['II', 'III', 'V']] });
    const done = reports.find((report) => report.type === 'order-done');
    expect(done?.type === 'order-done' && done.stops.length).toBe(LISTED_STOPS);
    expect(done?.type === 'order-done' && done.count).toBeGreaterThan(LISTED_STOPS);
  });
});
