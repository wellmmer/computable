import type { Stop } from '@/engines/bombe';
import type { RotorName, Three } from '@/engines/enigma';

/** What the page asks the worker: the menu's letters and place, and the rotor orders to test. */
export interface SearchRequest {
  cipher: string;
  crib: string;
  offset: number;
  orders: readonly Three<RotorName>[];
}

/** What the worker tells the page while it searches. `order` counts the rotor orders in the request, from 0. */
export type SearchReport =
  /** The start under test now, for the drum wall. */
  | { type: 'testing'; order: number; start: number }
  /** One rotor order is done. `stops` holds its stops, up to the list's limit; `count` counts them all. */
  | { type: 'order-done'; order: number; stops: readonly Stop[]; count: number }
  | { type: 'finished' }
  /** The worker could not load or run. `workerSearch` sends this, not the worker. */
  | { type: 'failed' };
