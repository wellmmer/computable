import { describe, expect, it } from 'vitest';
import { ROTOR_ORDERS } from '@/engines/bombe';
import { ordersToSearch } from './search-orders';

describe('ordersToSearch (spec R4 6: a test-only search of 1 rotor order)', () => {
  it('searches all 60 orders without the test setting', () => {
    expect(ordersToSearch(null)).toBe(ROTOR_ORDERS);
  });

  it('searches only the orders in the test setting', () => {
    expect(ordersToSearch('II III V')).toEqual([['II', 'III', 'V']]);
    expect(ordersToSearch('II III V, I IV V')).toEqual([
      ['II', 'III', 'V'],
      ['I', 'IV', 'V'],
    ]);
  });

  it('searches all 60 orders when the setting does not read right', () => {
    for (const setting of ['', 'II III', 'II II V', 'II III IX', 'II III V,']) expect(ordersToSearch(setting), setting).toBe(ROTOR_ORDERS);
  });
});
