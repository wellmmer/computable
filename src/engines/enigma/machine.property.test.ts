import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { encrypt, press, type EnigmaSettings, type Positions } from './machine';
import { ALPHABET, REFLECTOR_NAMES, ROTOR_NAMES, type Letter } from './parts';
import { checkSettings } from './settings';

const letter = fc.constantFrom(...ALPHABET);
const three = <T>(item: fc.Arbitrary<T>) => fc.tuple(item, item, item);

/** Random settings that the lab allows: 3 different rotors, any rings, either reflector, 0 to 13 plug pairs. */
const settings: fc.Arbitrary<EnigmaSettings> = fc
  .record({
    rotors: fc.shuffledSubarray([...ROTOR_NAMES], { minLength: 3, maxLength: 3 }),
    rings: three(letter),
    reflector: fc.constantFrom(...REFLECTOR_NAMES),
    plugged: fc.shuffledSubarray([...ALPHABET], { minLength: 0, maxLength: 26 }),
  })
  .map(({ rotors: [left, middle, right], rings, reflector, plugged }) => {
    const plugs: string[] = [];
    for (let i = 0; i + 1 < plugged.length; i += 2) plugs.push(plugged[i] + plugged[i + 1]);
    return { rotors: [left, middle, right], rings, reflector, plugs };
  });

const start: fc.Arbitrary<Positions> = three(letter);
const text = fc.array(letter, { minLength: 1, maxLength: 60 }).map((letters) => letters.join(''));

describe('Enigma with random settings (spec R3 2, property tests)', () => {
  it('only makes settings that checkSettings accepts', () => {
    fc.assert(
      fc.property(settings, (s) => {
        expect(checkSettings(s)).toEqual([]);
      }),
    );
  });

  it('gives the text back when the lit letters are typed from the same start', () => {
    fc.assert(
      fc.property(settings, start, text, (s, from, plain) => {
        expect(encrypt(s, from, encrypt(s, from, plain))).toBe(plain);
      }),
    );
  });

  it('never lights the letter that was typed', () => {
    fc.assert(
      fc.property(settings, start, text, (s, from, plain) => {
        const lamps = encrypt(s, from, plain);
        for (let i = 0; i < plain.length; i++) expect(lamps[i]).not.toBe(plain[i]);
      }),
    );
  });

  it('works in pairs at each position: when X lights Y, Y lights X', () => {
    fc.assert(
      fc.property(settings, start, letter, (s, from, key: Letter) => {
        const lamp = press({ settings: s, positions: from }, key).lamp;
        expect(press({ settings: s, positions: from }, lamp).lamp).toBe(key);
      }),
    );
  });
});
