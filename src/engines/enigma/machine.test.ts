import { describe, expect, it } from 'vitest';
import { encrypt, press, stepRotors, type EnigmaSettings, type Positions } from './machine';
import { ALPHABET, REFLECTORS, ROTORS } from './parts';

/** Rotors I II III, reflector B, rings A A A, no plug pairs. */
const PLAIN: EnigmaSettings = { rotors: ['I', 'II', 'III'], rings: ['A', 'A', 'A'], reflector: 'B', plugs: [] };

/** The lab's default settings (spec R3 3). */
const LAB: EnigmaSettings = { ...PLAIN, plugs: ['AV', 'BS', 'CG', 'DL', 'FU', 'HZ', 'IN', 'KM', 'OW', 'RX'] };

describe('the parts (spec R3 8: checked against Wikipedia and the Crypto Museum)', () => {
  it('wires each rotor as a mix of all 26 letters', () => {
    for (const [name, { wiring }] of Object.entries(ROTORS)) expect([...wiring].sort().join(''), name).toBe(ALPHABET.join(''));
  });

  it('gives rotors VI, VII and VIII two notches, Z and M, and the others one', () => {
    expect(Object.fromEntries(Object.entries(ROTORS).map(([name, { notches }]) => [name, notches.join('')]))).toEqual({
      I: 'Q',
      II: 'E',
      III: 'V',
      IV: 'J',
      V: 'Z',
      VI: 'ZM',
      VII: 'ZM',
      VIII: 'ZM',
    });
  });

  it('wires each reflector in 13 pairs, so no letter goes back to itself', () => {
    for (const [name, wiring] of Object.entries(REFLECTORS)) {
      ALPHABET.forEach((letter, i) => {
        const partner = wiring[i];
        expect(partner, `${name} ${letter}`).not.toBe(letter);
        expect(wiring[ALPHABET.join('').indexOf(partner)], `${name} ${letter}`).toBe(letter);
      });
    }
  });
});

describe('stepRotors (spec R3 2, "Stepping")', () => {
  it('turns the middle rotor when the right rotor stands at its notch', () => {
    expect(stepRotors(['I', 'II', 'III'], ['A', 'A', 'U'])).toEqual(['A', 'A', 'V']);
    expect(stepRotors(['I', 'II', 'III'], ['A', 'A', 'V'])).toEqual(['A', 'B', 'W']);
  });

  it('steps the middle and left rotors together when the middle rotor stands at its notch (the double step)', () => {
    const windows: string[] = [];
    let positions: Positions = ['A', 'D', 'U'];
    for (let i = 0; i < 4; i++) {
      positions = stepRotors(['I', 'II', 'III'], positions);
      windows.push(positions.join(''));
    }
    expect(windows).toEqual(['ADV', 'AEW', 'BFX', 'BFY']);
  });

  it('uses both notches of rotors VI to VIII: Z and M', () => {
    expect(stepRotors(['I', 'II', 'VI'], ['A', 'A', 'M'])).toEqual(['A', 'B', 'N']);
    expect(stepRotors(['I', 'II', 'VI'], ['A', 'A', 'Z'])).toEqual(['A', 'B', 'A']);
    expect(stepRotors(['I', 'VII', 'III'], ['A', 'M', 'A'])).toEqual(['B', 'N', 'B']);
    expect(stepRotors(['I', 'VIII', 'III'], ['A', 'Z', 'A'])).toEqual(['B', 'A', 'B']);
  });
});

describe('encrypt (spec R3 2, tests)', () => {
  it('turns AAAAA into BDZGO with rotors I II III, reflector B, rings A A A, start A A A and no plug pairs', () => {
    expect(encrypt(PLAIN, ['A', 'A', 'A'], 'AAAAA')).toBe('BDZGO');
  });

  it('turns WETTERBERICHT into PBJGOLIZQMQGZ with the default lab settings', () => {
    expect(encrypt(LAB, ['B', 'L', 'A'], 'WETTERBERICHT')).toBe('PBJGOLIZQMQGZ');
  });

  // The next three results come from a second tool, py-enigma 1.0.2, not from this engine.
  it('uses the ring settings: rings B B B turn AAAAA into EWTYX', () => {
    expect(encrypt({ ...PLAIN, rings: ['B', 'B', 'B'] }, ['A', 'A', 'A'], 'AAAAA')).toBe('EWTYX');
  });

  it('uses rotors VI, VII and VIII and reflector C', () => {
    const settings: EnigmaSettings = { rotors: ['VI', 'VII', 'VIII'], rings: ['C', 'D', 'E'], reflector: 'C', plugs: ['AQ', 'BW'] };
    expect(encrypt(settings, ['X', 'M', 'Z'], 'HELLOWORLDHELLOWORLD')).toBe('JAROCAFQXVSMEIPBYGCR');
  });

  it('uses rotors IV and V', () => {
    const settings: EnigmaSettings = { rotors: ['IV', 'V', 'I'], rings: ['Q', 'R', 'S'], reflector: 'B', plugs: ['PO', 'ML', 'IU', 'KJ', 'NH', 'YT'] };
    expect(encrypt(settings, ['Z', 'Z', 'Z'], 'ENIGMAMACHINETESTMESSAGE')).toBe('ITTSQCBBZDXTUFQXXZYZDDZD');
  });

  it('refuses a text with a character that is not a letter from A to Z', () => {
    expect(() => encrypt(PLAIN, ['A', 'A', 'A'], 'AB C')).toThrow('Enigma has no key for " "');
  });
});

describe('press (spec R3 2, "Pure functions")', () => {
  it('turns the rotors, then gives the lamp and the letter after each part, as the mockup draws for T', () => {
    const result = press({ settings: LAB, positions: ['B', 'L', 'M'] }, 'T');
    expect(result.state.positions).toEqual(['B', 'L', 'N']);
    expect(result.lamp).toBe('Z');
    expect(result.path.map(({ part, letter }) => `${part} ${letter}`)).toEqual([
      'key T',
      'plugboard T',
      'right P',
      'middle P',
      'left W',
      'reflector V',
      'left M',
      'middle X',
      'right H',
      'plugboard Z',
    ]);
  });

  it('leaves the state it was given as it was', () => {
    const state = { settings: LAB, positions: ['B', 'L', 'A'] } as const;
    press(state, 'W');
    expect(state.positions).toEqual(['B', 'L', 'A']);
  });
});
