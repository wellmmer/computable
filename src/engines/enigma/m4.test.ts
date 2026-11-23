import { describe, expect, it } from 'vitest';
import { ALPHABET, THIN_REFLECTORS, THIN_ROTORS } from './parts';

describe('the M4 thin parts (spec R5a 2, checked against Wikipedia and the Crypto Museum)', () => {
  it('has the wirings of both sources, letter by letter', () => {
    expect(THIN_ROTORS).toEqual({ Beta: 'LEYJVCNIXWPBQMDRTAKZGFUHOS', Gamma: 'FSOKANUERHMBTIYCWLQPZXVGJD' });
    expect(THIN_REFLECTORS).toEqual({ B: 'ENKQAUYWJICOPBLMDXZVFTHRGS', C: 'RDOBJNTKVEHMLFCWZAXGYIPSUQ' });
  });

  it('wires each thin rotor as a mix of all 26 letters', () => {
    for (const [name, wiring] of Object.entries(THIN_ROTORS)) expect([...wiring].sort().join(''), name).toBe(ALPHABET.join(''));
  });

  it('wires each thin reflector in 13 pairs, so no letter goes back to itself', () => {
    for (const [name, wiring] of Object.entries(THIN_REFLECTORS)) {
      ALPHABET.forEach((letter, i) => {
        expect(wiring[i], `${name} ${letter}`).not.toBe(letter);
        expect(wiring[ALPHABET.join('').indexOf(wiring[i])], `${name} ${letter}`).toBe(letter);
      });
    }
  });
});
