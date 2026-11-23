import { BOMBE_ROTORS } from '@/engines/bombe';
import { ALPHABET, letterAt, type EnigmaSettings, type Positions } from '@/engines/enigma';

/** A key for Home's secret: the settings and the start. */
export interface SecretKey {
  settings: EnigmaSettings;
  start: Positions;
}

/** How many plug pairs a Home key gets, as on a German key sheet of 1940. */
export const KEY_PLUG_PAIRS = 10;

/** The items of `items` in a random order (Fisher–Yates). `random` gives numbers from 0 up to 1. */
function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * A random key for a new Home secret (spec R4 4): 3 different rotors from I to V, a random start,
 * 10 random plug pairs, rings A A A and reflector B. The Bombe tests exactly these rotors and rings,
 * so it can find the key. Tests hand in their own `random`.
 */
export function randomKey(random: () => number = Math.random): SecretKey {
  const [left, middle, right] = shuffle(BOMBE_ROTORS, random);
  const start: Positions = [letterAt(Math.floor(random() * 26)), letterAt(Math.floor(random() * 26)), letterAt(Math.floor(random() * 26))];
  const letters = shuffle(ALPHABET, random);
  const plugs: string[] = [];
  for (let i = 0; i < KEY_PLUG_PAIRS * 2; i += 2) plugs.push([letters[i], letters[i + 1]].sort().join(''));
  return { settings: { rotors: [left, middle, right], rings: ['A', 'A', 'A'], reflector: 'B', plugs: plugs.sort() }, start };
}
