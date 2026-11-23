/** The 26 letters. Enigma has no other keys: no digits, no space, no accents. */
export const ALPHABET = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
  'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
] as const;

export type Letter = (typeof ALPHABET)[number];

export function isLetter(value: string): value is Letter {
  return value.length === 1 && value >= 'A' && value <= 'Z';
}

/** The letter at `index`, counted round the alphabet: -1 is Z and 26 is A. */
export function letterAt(index: number): Letter {
  return ALPHABET[((index % 26) + 26) % 26];
}

export function indexOf(letter: Letter): number {
  return letter.charCodeAt(0) - 65;
}

export const ROTOR_NAMES = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'] as const;
export type RotorName = (typeof ROTOR_NAMES)[number];

export interface Rotor {
  /** The letter that comes out for A, B, C… when the rotor stands at A with ring A. */
  wiring: string;
  /** The window letters at which this rotor turns the rotor on its left at the next key press. */
  notches: readonly Letter[];
}

/**
 * Rotors I to V (Enigma I and M3) and VI to VIII (naval M3 and M4). Checked letter by letter on
 * 2026-11-19 against Wikipedia, "Enigma rotor details", and the Crypto Museum, "Enigma wiring".
 */
export const ROTORS: Record<RotorName, Rotor> = {
  I: { wiring: 'EKMFLGDQVZNTOWYHXUSPAIBRCJ', notches: ['Q'] },
  II: { wiring: 'AJDKSIRUXBLHWTMCQGZNPYFVOE', notches: ['E'] },
  III: { wiring: 'BDFHJLCPRTXVZNYEIWGAKMUSQO', notches: ['V'] },
  IV: { wiring: 'ESOVPZJAYQUIRHXLNFTGKDCMWB', notches: ['J'] },
  V: { wiring: 'VZBRGITYUPSDNHLXAWMJQOFECK', notches: ['Z'] },
  VI: { wiring: 'JPGVOUMFYQBENHZRDKASXLICTW', notches: ['Z', 'M'] },
  VII: { wiring: 'NZJHGRCXMYSWBOUFAIVLPEKQDT', notches: ['Z', 'M'] },
  VIII: { wiring: 'FKQHTLXOCBJSPDZRAMEWNIUYGV', notches: ['Z', 'M'] },
};

export const REFLECTOR_NAMES = ['B', 'C'] as const;
export type ReflectorName = (typeof REFLECTOR_NAMES)[number];

/** Reflectors B and C (UKW-B, UKW-C), from the same two sources as the rotors. */
export const REFLECTORS: Record<ReflectorName, string> = {
  B: 'YRUHQSLDPXNGOKMIEBFZCWVJAT',
  C: 'FVPJIAOYEDRZXWGCTKUQSBNMHL',
};

export const THIN_ROTOR_NAMES = ['Beta', 'Gamma'] as const;
export type ThinRotorName = (typeof THIN_ROTOR_NAMES)[number];

/**
 * The thin rotors of the naval M4. They sit left of the left rotor and never turn, so they have no
 * notch. Checked letter by letter on 2026-11-23 against Wikipedia, "Enigma rotor details", and the
 * Crypto Museum, "Enigma wiring".
 */
export const THIN_ROTORS: Record<ThinRotorName, string> = {
  Beta: 'LEYJVCNIXWPBQMDRTAKZGFUHOS',
  Gamma: 'FSOKANUERHMBTIYCWLQPZXVGJD',
};

export const THIN_REFLECTOR_NAMES = ['B', 'C'] as const;
export type ThinReflectorName = (typeof THIN_REFLECTOR_NAMES)[number];

/** The thin reflectors B and C of the naval M4 (UKW-b, UKW-c), from the same two sources, on the same day. */
export const THIN_REFLECTORS: Record<ThinReflectorName, string> = {
  B: 'ENKQAUYWJICOPBLMDXZVFTHRGS',
  C: 'RDOBJNTKVEHMLFCWZAXGYIPSUQ',
};

/** The German key rows of Enigma I, used by both the keyboard and the lampboard. */
export const KEY_ROWS: readonly (readonly Letter[])[] = [
  ['Q', 'W', 'E', 'R', 'T', 'Z', 'U', 'I', 'O'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K'],
  ['P', 'Y', 'X', 'C', 'V', 'B', 'N', 'M', 'L'],
];
