import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { ALPHABET, encrypt, type EnigmaSettings, type Positions, type RotorName, type Three } from '@/engines/enigma';
import { buildMenu } from './menu';
import { BOMBE_ROTORS, scramblerTables, startIndex } from './scramblers';
import { createTester, testStart, type Stop } from './search';

/** True when the stop has the key's rotors and start, and every pair it found is one of the key's pairs. */
function isKey(stop: Stop, settings: EnigmaSettings, start: Positions): boolean {
  const pairs = settings.plugs.map((pair) => [...pair].sort().join(''));
  return stop.rotors.join(' ') === settings.rotors.join(' ') && stop.start.join('') === start.join('') && stop.plugs.every((pair) => pairs.includes(pair));
}

describe('testStart (spec R4 2, "One test")', () => {
  it('stops at the lab key for WETTERBERICHT, and finds only true plug pairs', () => {
    // The lab's first settings light PBJGOLIZQMQGZ for WETTERBERICHT (spec R3 3).
    const settings: EnigmaSettings = { rotors: ['I', 'II', 'III'], rings: ['A', 'A', 'A'], reflector: 'B', plugs: ['AV', 'BS', 'CG', 'DL', 'FU', 'HZ', 'IN', 'KM', 'OW', 'RX'] };
    const tester = createTester(scramblerTables(settings.rotors), buildMenu('PBJGOLIZQMQGZ', 'WETTERBERICHT', 0));
    const stops = testStart(tester, startIndex(['B', 'L', 'A']));
    expect(stops.some((stop) => isKey(stop, settings, ['B', 'L', 'A']))).toBe(true);
  });

  it('tries every partner when the first guess lights one wire: a guess can fit and still be wrong', () => {
    // Without a loop, the first guess "C is plugged to A" fits here, with pairs AT HO PX UY. The key has other pairs.
    const settings: EnigmaSettings = { rotors: ['II', 'III', 'IV'], rings: ['A', 'A', 'A'], reflector: 'B', plugs: ['AY', 'DH', 'EX', 'FR', 'GV', 'JL', 'KW', 'MN', 'OZ', 'PT'] };
    expect(encrypt(settings, ['K', 'Q', 'C'], 'WETTERBERICHT')).toBe('KZUABNJFCRVTP');
    const tester = createTester(scramblerTables(settings.rotors), buildMenu('KZUABNJFCRVTP', 'WETTERBERICHT', 0));
    const stops = testStart(tester, startIndex(['K', 'Q', 'C']));
    expect(stops.map(({ plugs }) => plugs.join(' '))).toContain('AT HO PX UY');
    expect(stops.some((stop) => isKey(stop, settings, ['K', 'Q', 'C']))).toBe(true);
  });

  it('refuses a menu without links', () => {
    expect(() => createTester(scramblerTables(['I', 'II', 'III']), buildMenu('ABC', '', 0))).toThrow('The menu has no links.');
  });
});

const letter = fc.constantFrom(...ALPHABET);

/** A key as the spec's Home key: 3 different rotors from I to V, any start, 10 plug pairs, rings A A A, reflector B. */
const key = fc
  .record({
    rotors: fc.shuffledSubarray([...BOMBE_ROTORS], { minLength: 3, maxLength: 3 }),
    start: fc.tuple(letter, letter, letter),
    plugged: fc.shuffledSubarray([...ALPHABET], { minLength: 20, maxLength: 20 }),
  })
  .map(({ rotors: [left, middle, right], start, plugged }) => {
    const rotors: Three<RotorName> = [left, middle, right];
    const plugs = Array.from({ length: 10 }, (_, i) => plugged[2 * i] + plugged[2 * i + 1]);
    const settings: EnigmaSettings = { rotors, rings: ['A', 'A', 'A'], reflector: 'B', plugs };
    return { settings, start };
  });

describe('the Bombe with random keys (spec R4 2, property test)', () => {
  it('stops at the true key for a 15-letter crib taken from the message', () => {
    fc.assert(
      fc.property(key, fc.array(letter, { minLength: 30, maxLength: 60 }), fc.nat(15), ({ settings, start }, letters, place) => {
        const plain = letters.join('');
        const crib = plain.slice(place, place + 15);
        const menu = buildMenu(encrypt(settings, start, plain), crib, place);
        // The other 59 rotor orders cannot hold the key, so the test only needs the key's order and start.
        const stops = testStart(createTester(scramblerTables(settings.rotors), menu), startIndex(start));
        expect(stops.some((stop) => isKey(stop, settings, start))).toBe(true);
      }),
      { numRuns: 20 },
    );
  });
});
