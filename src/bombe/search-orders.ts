import { ROTOR_ORDERS } from '@/engines/bombe';
import { ROTOR_NAMES, type RotorName, type Three } from '@/engines/enigma';

/**
 * A setting for end-to-end tests only: rotor orders such as "II III V", split by commas. The full
 * search is too slow for Playwright, so tests set this in sessionStorage before the page loads. The
 * page never shows it.
 */
export const TEST_ORDERS_KEY = 'computable.test.bombe-orders';

const isRotorName = (name: string): name is RotorName => (ROTOR_NAMES as readonly string[]).includes(name);

/** The rotor orders to search: all 60, or the orders in the test setting when it reads right. */
export function ordersToSearch(setting: string | null): readonly Three<RotorName>[] {
  if (setting === null) return ROTOR_ORDERS;
  const orders: Three<RotorName>[] = [];
  for (const order of setting.split(',')) {
    const names = order.trim().split(/\s+/);
    if (names.length !== 3 || !names.every(isRotorName) || new Set(names).size !== 3) return ROTOR_ORDERS;
    const [left, middle, right] = names;
    orders.push([left, middle, right]);
  }
  return orders;
}

/** Reads the test setting. Blocked storage reads as no setting. */
export function readTestOrders(): string | null {
  try {
    return window.sessionStorage.getItem(TEST_ORDERS_KEY);
  } catch {
    return null;
  }
}
