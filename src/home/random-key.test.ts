import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { BOMBE_ROTORS } from '@/engines/bombe';
import { checkSettings } from '@/engines/enigma';
import { randomKey } from './random-key';

/** A random source that gives `values` in turn, again and again. */
const cycle = (values: readonly number[]) => {
  let i = 0;
  return () => values[i++ % values.length];
};

describe('randomKey (spec R4 4, "Home key")', () => {
  it('draws 3 different rotors from I to V, a start, 10 plug pairs, rings A A A and reflector B', () => {
    fc.assert(
      fc.property(fc.array(fc.double({ min: 0, max: 1, maxExcluded: true, noNaN: true }), { minLength: 1, maxLength: 40 }), (values) => {
        const { settings, start } = randomKey(cycle(values));
        expect(checkSettings(settings)).toEqual([]);
        expect(settings.rotors.every((rotor) => (BOMBE_ROTORS as readonly string[]).includes(rotor))).toBe(true);
        expect(settings.rings).toEqual(['A', 'A', 'A']);
        expect(settings.reflector).toBe('B');
        expect(settings.plugs).toHaveLength(10);
        expect(new Set(settings.plugs.join('')).size).toBe(20);
        expect(start.every((letter) => /^[A-Z]$/.test(letter))).toBe(true);
      }),
    );
  });

  it('writes each pair and the list of pairs in alphabetical order, like the Bombe', () => {
    const { plugs } = randomKey(cycle([0.9, 0.1, 0.5, 0.3, 0.7])).settings;
    for (const pair of plugs) expect(pair[0] < pair[1]).toBe(true);
    expect([...plugs].sort()).toEqual(plugs);
  });

  it('gives the same key for the same random numbers, so tests can pick a key', () => {
    expect(randomKey(() => 0)).toEqual({
      settings: { rotors: ['II', 'III', 'IV'], rings: ['A', 'A', 'A'], reflector: 'B', plugs: ['BC', 'DE', 'FG', 'HI', 'JK', 'LM', 'NO', 'PQ', 'RS', 'TU'] },
      start: ['A', 'A', 'A'],
    });
  });

  it('uses Math.random when no source is given, so two keys almost never match', () => {
    expect(randomKey()).not.toEqual(randomKey());
  });
});
