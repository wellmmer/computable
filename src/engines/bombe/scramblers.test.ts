import { describe, expect, it } from 'vitest';
import { ALPHABET, encrypt, stepRotors, type EnigmaSettings, type Positions, type RotorName, type Three } from '@/engines/enigma';
import { ROTOR_ORDERS, scramblerTables, START_COUNT, startAt, startIndex } from './scramblers';

describe('ROTOR_ORDERS (spec R4 2, "Search")', () => {
  it('lists the 60 orders of 3 different rotors from I to V', () => {
    expect(ROTOR_ORDERS).toHaveLength(60);
    expect(new Set(ROTOR_ORDERS.map((order) => order.join(' '))).size).toBe(60);
    for (const order of ROTOR_ORDERS) {
      expect(new Set(order).size, order.join(' ')).toBe(3);
      for (const rotor of order) expect(['I', 'II', 'III', 'IV', 'V']).toContain(rotor);
    }
    expect(ROTOR_ORDERS[0]).toEqual(['I', 'II', 'III']);
  });
});

describe('startIndex and startAt', () => {
  it('number the starts from A A A (0) to Z Z Z (17,575)', () => {
    expect(startIndex(['A', 'A', 'A'])).toBe(0);
    expect(startIndex(['A', 'A', 'B'])).toBe(1);
    expect(startIndex(['Z', 'Z', 'Z'])).toBe(START_COUNT - 1);
    expect(startAt(startIndex(['Q', 'K', 'A']))).toEqual(['Q', 'K', 'A']);
  });
});

describe('scramblerTables (spec R4 2, "One test" and "Stepping")', () => {
  const orders: Three<RotorName>[] = [['I', 'II', 'III'], ['II', 'III', 'V'], ['V', 'IV', 'I']];

  it.each(orders.map((rotors) => [rotors.join(' '), rotors] as const))('gives the letters the Enigma without plugboard lights, rotors %s', (_name, rotors) => {
    const tables = scramblerTables(rotors);
    const settings: EnigmaSettings = { rotors, rings: ['A', 'A', 'A'], reflector: 'B', plugs: [] };
    // Starts near the notches, so the tables meet the middle rotor's double step.
    const starts: Positions[] = [['A', 'A', 'A'], ['Q', 'E', 'U'], ['Z', 'D', 'Y'], ['M', 'J', 'Z'], ['A', 'U', 'X'], ['D', 'I', 'P']];
    for (const start of starts) {
      let position = startIndex(start);
      for (let presses = 1; presses <= 30; presses++) {
        position = tables.next[position];
        for (const letter of ALPHABET) {
          // The rotors turn before each letter, so the letter typed after presses - 1 others meets the rotors at `position`.
          const lamp = encrypt(settings, start, 'A'.repeat(presses - 1) + letter).at(-1);
          expect(ALPHABET[tables.wiring[position * 26 + letter.charCodeAt(0) - 65]], `${start.join('')} +${presses} ${letter}`).toBe(lamp);
        }
      }
    }
  });

  it('turns the rotors like the Enigma engine, with the double step', () => {
    const rotors = ['II', 'III', 'V'] as const;
    const tables = scramblerTables(rotors);
    for (let position = 0; position < START_COUNT; position += 97) {
      expect(tables.next[position]).toBe(startIndex(stepRotors(rotors, startAt(position))));
    }
  });
});
