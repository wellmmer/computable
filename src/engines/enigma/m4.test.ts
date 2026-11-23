import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { encrypt, isM4, modelOf, press, type EnigmaSettings, type EnigmaState, type M4Settings, type Positions } from './machine';
import { ALPHABET, REFLECTOR_NAMES, ROTOR_NAMES, THIN_REFLECTOR_NAMES, THIN_REFLECTORS, THIN_ROTOR_NAMES, THIN_ROTORS, type Letter } from './parts';
import { checkSettings } from './settings';

const letter = fc.constantFrom(...ALPHABET);
const three = <T>(item: fc.Arbitrary<T>) => fc.tuple(item, item, item);
const rotors = fc.shuffledSubarray([...ROTOR_NAMES], { minLength: 3, maxLength: 3 }).map(([left, middle, right]) => [left, middle, right] as const);
const plugs = fc.shuffledSubarray([...ALPHABET], { minLength: 0, maxLength: 26 }).map((plugged) => {
  const pairs: string[] = [];
  for (let i = 0; i + 1 < plugged.length; i += 2) pairs.push(plugged[i] + plugged[i + 1]);
  return pairs;
});

/** Random Enigma I settings that the lab allows. */
const enigmaI: fc.Arbitrary<EnigmaSettings> = fc.record({ rotors, rings: three(letter), reflector: fc.constantFrom(...REFLECTOR_NAMES), plugs });

/** Random M4 settings that the lab allows: any thin rotor, ring, window letter and thin reflector. */
const m4: fc.Arbitrary<M4Settings> = fc.record({
  model: fc.constant('M4' as const),
  thinRotor: fc.constantFrom(...THIN_ROTOR_NAMES),
  thinRing: letter,
  thinPosition: letter,
  rotors,
  rings: three(letter),
  reflector: fc.constantFrom(...THIN_REFLECTOR_NAMES),
  plugs,
});

const start: fc.Arbitrary<Positions> = three(letter);
const text = fc.array(letter, { minLength: 1, maxLength: 60 }).map((letters) => letters.join(''));

/** The M4 that the spec's theory says matches an Enigma I: the thin rotor at A, ring A. */
function asM4(settings: EnigmaSettings, thinRotor: M4Settings['thinRotor']): M4Settings {
  return { model: 'M4', thinRotor, thinRing: 'A', thinPosition: 'A', ...settings };
}

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

describe('the M4 model (spec R5a 2)', () => {
  it('reads settings without a model as the Enigma I, and model M4 as the M4', () => {
    const enigma: EnigmaSettings = { rotors: ['I', 'II', 'III'], rings: ['A', 'A', 'A'], reflector: 'B', plugs: [] };
    expect([isM4(enigma), modelOf(enigma)]).toEqual([false, 'I']);
    expect([isM4(asM4(enigma, 'Beta')), modelOf(asM4(enigma, 'Beta'))]).toEqual([true, 'M4']);
  });

  it('lights the same letters as the Enigma I with reflector B, with Beta at A, ring A, and thin reflector B', () => {
    fc.assert(
      fc.property(enigmaI, start, text, (settings, from, plain) => {
        const withB: EnigmaSettings = { ...settings, reflector: 'B' };
        expect(encrypt(asM4(withB, 'Beta'), from, plain)).toBe(encrypt(withB, from, plain));
      }),
    );
  });

  it('lights the same letters as the Enigma I with reflector C, with Gamma at A, ring A, and thin reflector C', () => {
    fc.assert(
      fc.property(enigmaI, start, text, (settings, from, plain) => {
        const withC: EnigmaSettings = { ...settings, reflector: 'C' };
        expect(encrypt(asM4(withC, 'Gamma'), from, plain)).toBe(encrypt(withC, from, plain));
      }),
    );
  });

  it('lights other letters when the thin rotor stands at B', () => {
    const enigma: EnigmaSettings = { rotors: ['I', 'II', 'III'], rings: ['A', 'A', 'A'], reflector: 'B', plugs: [] };
    expect(encrypt(enigma, ['A', 'A', 'A'], 'AAAAA')).toBe('BDZGO');
    const turned: M4Settings = { ...asM4(enigma, 'Beta'), thinPosition: 'B' };
    expect(encrypt(turned, ['A', 'A', 'A'], 'AAAAA')).not.toBe('BDZGO');
  });

  // Crypto Museum, "Dönitz message, 1 May 1945": https://www.cryptomuseum.com/crypto/enigma/msg/p1030681.htm
  // The page says the copies have reception errors, and its 28th group has 8 letters, so this uses the first 27 groups.
  it('decrypts the first 108 letters of the Dönitz message of 1 May 1945, as the Crypto Museum publishes them', () => {
    const settings: M4Settings = {
      model: 'M4',
      thinRotor: 'Beta',
      thinRing: 'E',
      thinPosition: 'C',
      rotors: ['V', 'VI', 'VIII'],
      rings: ['P', 'E', 'L'],
      reflector: 'C',
      plugs: ['AE', 'BF', 'CM', 'DQ', 'HU', 'JN', 'LX', 'PR', 'SZ', 'VW'],
    };
    const cipher =
      'LANO TCTO UARB BFPM HPHG CZXT DYGA HGUF XGEW KBLK GJWL QXXT GPJJ AVTO CKZF SLPP QIHZ FXOE BWII EKFZ LCLO AQJU LJOY HSSM BBGW HZAN VOII';
    expect(encrypt(settings, ['D', 'S', 'Z'], cipher.replaceAll(' ', ''))).toBe(
      'KRKRALLEXXFOLGENDESISTSOFORTBEKANNTZUGEBENXXICHHABEFOLGELNBEBEFEHLERHALTENXXJANSTERLEDESBISHERIGXNREICHSMARS',
    );
  });

  it('gives the text back when the lit letters are typed from the same start', () => {
    fc.assert(
      fc.property(m4, start, text, (settings, from, plain) => {
        expect(encrypt(settings, from, encrypt(settings, from, plain))).toBe(plain);
      }),
    );
  });

  it('never lights the letter that was typed', () => {
    fc.assert(
      fc.property(m4, start, text, (settings, from, plain) => {
        const lamps = encrypt(settings, from, plain);
        for (let i = 0; i < plain.length; i++) expect(lamps[i]).not.toBe(plain[i]);
      }),
    );
  });

  it('works in pairs at each position: when X lights Y, Y lights X', () => {
    fc.assert(
      fc.property(m4, start, letter, (settings, from, key: Letter) => {
        const lamp = press({ settings, positions: from }, key).lamp;
        expect(press({ settings, positions: from }, lamp).lamp).toBe(key);
      }),
    );
  });

  it('never turns the 4th rotor, over 1,000 key presses', () => {
    const enigma: EnigmaSettings = { rotors: ['VI', 'II', 'VIII'], rings: ['C', 'Q', 'Z'], reflector: 'B', plugs: ['AQ', 'BW'] };
    const keys = Array.from({ length: 1000 }, (_, i) => ALPHABET[(i * 7) % 26]);
    let state: EnigmaState<M4Settings> = { settings: asM4(enigma, 'Beta'), positions: ['Q', 'D', 'U'] };
    let lamps = '';
    for (const key of keys) {
      const result = press(state, key);
      state = result.state;
      lamps += result.lamp;
      expect(result.state.positions).toHaveLength(3);
      expect(result.state.settings.thinPosition).toBe('A');
    }
    // A thin rotor that turned would no longer match the Enigma I with reflector B.
    expect(lamps).toBe(encrypt(enigma, ['Q', 'D', 'U'], keys.join('')));
  });

  it('sends the current through the thin rotor on the way to the reflector and on the way back', () => {
    const settings = asM4({ rotors: ['I', 'II', 'III'], rings: ['A', 'A', 'A'], reflector: 'B', plugs: [] }, 'Gamma');
    expect(press({ settings, positions: ['A', 'A', 'A'] }, 'A').path.map(({ part }) => part)).toEqual([
      'key',
      'plugboard',
      'right',
      'middle',
      'left',
      'thin',
      'reflector',
      'thin',
      'left',
      'middle',
      'right',
      'plugboard',
    ]);
  });

  it('accepts M4 settings that the lab allows, and refuses the same rotor twice', () => {
    fc.assert(
      fc.property(m4, (settings) => {
        expect(checkSettings(settings)).toEqual([]);
      }),
    );
    const settings = asM4({ rotors: ['I', 'III', 'I'], rings: ['A', 'A', 'A'], reflector: 'B', plugs: [] }, 'Beta');
    expect(checkSettings(settings)).toEqual([{ field: 'rotors', problem: 'same-rotor', letters: 'I' }]);
  });
});
