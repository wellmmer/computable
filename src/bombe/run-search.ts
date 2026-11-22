import { buildMenu, createTester, scramblerTables, START_COUNT, testStart, type Stop } from '@/engines/bombe';
import type { SearchReport, SearchRequest } from './search-messages';

/** The stops list shows at most this many stops. A short crib can give millions. */
export const LISTED_STOPS = 100;

/** The drum wall hears about the start under test 8 times for each rotor order. */
const TESTING_EVERY = START_COUNT / 8;

/**
 * The whole search, as the worker runs it: each rotor order in turn, all 17,576 starts. `send`
 * gets the reports. The page stops a search by ending the worker.
 */
export function runSearch({ cipher, crib, offset, orders }: SearchRequest, send: (report: SearchReport) => void): void {
  const menu = buildMenu(cipher, crib, offset);
  let listed = 0;
  orders.forEach((rotors, order) => {
    const tester = createTester(scramblerTables(rotors), menu);
    const stops: Stop[] = [];
    let count = 0;
    for (let start = 0; start < START_COUNT; start++) {
      if (start % TESTING_EVERY === 0) send({ type: 'testing', order, start });
      for (const stop of testStart(tester, start)) {
        count++;
        if (listed < LISTED_STOPS) {
          stops.push(stop);
          listed++;
        }
      }
    }
    send({ type: 'order-done', order, stops, count });
  });
  send({ type: 'finished' });
}
