import { ALPHABET, letterAt, REFLECTORS, ROTORS, stepRotors, type Positions, type RotorName, type Three } from '@/engines/enigma';

/** The 5 rotors of Enigma I that the Bombe tries. */
export const BOMBE_ROTORS = ['I', 'II', 'III', 'IV', 'V'] as const satisfies readonly RotorName[];

/** The 60 rotor orders: 3 different rotors from I to V, left to right. */
export const ROTOR_ORDERS: readonly Three<RotorName>[] = BOMBE_ROTORS.flatMap((left) =>
  BOMBE_ROTORS.filter((middle) => middle !== left).flatMap((middle) =>
    BOMBE_ROTORS.filter((right) => right !== left && right !== middle).map((right): Three<RotorName> => [left, middle, right]),
  ),
);

/** 26 × 26 × 26: the starts of one rotor order. */
export const START_COUNT = 17_576;

/** The number of a start: A A A is 0, A A B is 1, Z Z Z is 17,575. */
export function startIndex([left, middle, right]: Positions): number {
  return (left.charCodeAt(0) - 65) * 676 + (middle.charCodeAt(0) - 65) * 26 + (right.charCodeAt(0) - 65);
}

/** The start with the number `index`. */
export function startAt(index: number): Positions {
  return [letterAt(Math.floor(index / 676)), letterAt(Math.floor(index / 26) % 26), letterAt(index % 26)];
}

/**
 * The tables one rotor order needs. `wiring` holds 26 letters for each of the 17,576 window
 * positions: the letter that comes out of the Enigma without its plugboard, rings A A A,
 * reflector B. `next` gives the position after one key press, with the double step.
 */
export interface ScramblerTables {
  rotors: Three<RotorName>;
  /** Position × 26 + letter in → letter out, as numbers 0 to 25. */
  wiring: Uint8Array;
  /** Position → the position after the rotors turn once. */
  next: Uint16Array;
}

const toNumbers = (wiring: string) => Uint8Array.from(wiring, (letter) => letter.charCodeAt(0) - 65);

/** The letter numbers a rotor gives from right to left (`forward`) and back. */
function rotorTables(name: RotorName) {
  const forward = toNumbers(ROTORS[name].wiring);
  const back = new Uint8Array(26);
  forward.forEach((out, into) => (back[out] = into));
  return { forward, back };
}

/** Builds the tables for one rotor order: 17,576 × 26 letters, and the stepping. */
export function scramblerTables(rotors: Three<RotorName>): ScramblerTables {
  const [left, middle, right] = rotors.map(rotorTables);
  const reflector = toNumbers(REFLECTORS.B);
  const wiring = new Uint8Array(START_COUNT * 26);
  const next = new Uint16Array(START_COUNT);
  const through = (table: Uint8Array, shift: number, letter: number) => (table[(letter + shift) % 26] - shift + 26) % 26;

  for (let position = 0; position < START_COUNT; position++) {
    const l = Math.floor(position / 676);
    const m = Math.floor(position / 26) % 26;
    const r = position % 26;
    for (let letter = 0; letter < 26; letter++) {
      let x = through(right.forward, r, letter);
      x = through(middle.forward, m, x);
      x = through(left.forward, l, x);
      x = reflector[x];
      x = through(left.back, l, x);
      x = through(middle.back, m, x);
      wiring[position * 26 + letter] = through(right.back, r, x);
    }
    next[position] = startIndex(stepRotors(rotors, [ALPHABET[l], ALPHABET[m], ALPHABET[r]]));
  }
  return { rotors, wiring, next };
}
