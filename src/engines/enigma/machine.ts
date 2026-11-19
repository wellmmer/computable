import { indexOf, isLetter, letterAt, REFLECTORS, ROTORS, type Letter, type ReflectorName, type RotorName } from './parts';

/** Three things in the order the visitor sees them on the machine: left, middle, right. */
export type Three<T> = readonly [T, T, T];

/** The letters in the three rotor windows, left to right. */
export type Positions = Three<Letter>;

/** How the machine is set up. `checkSettings` says whether a setting is allowed. */
export interface EnigmaSettings {
  /** The left, middle and right rotor. */
  rotors: Three<RotorName>;
  /** The ring setting of each rotor, left to right. */
  rings: Three<Letter>;
  reflector: ReflectorName;
  /** Plug pairs such as "AV": the plugboard swaps A and V on the way in and on the way out. */
  plugs: readonly string[];
}

export interface EnigmaState {
  settings: EnigmaSettings;
  positions: Positions;
}

/** The parts the current passes, in the order of the spec (R3 2): out to the reflector and back. */
export type PathPart = 'key' | 'plugboard' | 'right' | 'middle' | 'left' | 'reflector';

export interface PathPoint {
  part: PathPart;
  /** The letter after this part. */
  letter: Letter;
}

export interface Press {
  /** The state after the key press: only the rotor windows change. */
  state: EnigmaState;
  /** The lamp that lights. */
  lamp: Letter;
  /** The letter after each part: key, plugboard, right, middle, left, reflector, left, middle, right, plugboard. */
  path: readonly PathPoint[];
}

/**
 * The windows after the rotors turn, before a letter goes through. The right rotor always turns. When
 * the middle rotor stands at its notch, the middle and left rotors both turn (the double step).
 * Otherwise, when the right rotor stands at its notch, the middle rotor turns.
 */
export function stepRotors(rotors: Three<RotorName>, [left, middle, right]: Positions): Positions {
  const atNotch = (slot: 1 | 2, letter: Letter) => ROTORS[rotors[slot]].notches.includes(letter);
  const next = (letter: Letter) => letterAt(indexOf(letter) + 1);
  if (atNotch(1, middle)) return [next(left), next(middle), next(right)];
  if (atNotch(2, right)) return [left, next(middle), next(right)];
  return [left, middle, next(right)];
}

/** The letter the plugboard gives for `letter`: its partner, or the same letter without a pair. */
function plug(plugs: readonly string[], letter: Letter): Letter {
  for (const [a, b] of plugs) {
    if (a === letter && isLetter(b)) return b;
    if (b === letter && isLetter(a)) return a;
  }
  return letter;
}

/** The letter that a wiring such as "EKMF…" gives for `letter`. */
function wiredTo(wiring: string, letter: Letter): Letter {
  return letterAt(wiring.charCodeAt(indexOf(letter)) - 65);
}

/** One rotor, from right to left (`back` false) or from left to right (`back` true). */
function throughRotor(rotor: RotorName, ring: Letter, position: Letter, letter: Letter, back: boolean): Letter {
  const shift = indexOf(position) - indexOf(ring);
  const { wiring } = ROTORS[rotor];
  const contact = letterAt(indexOf(letter) + shift);
  const out = back ? wiring.indexOf(contact) : indexOf(wiredTo(wiring, contact));
  return letterAt(out - shift);
}

/**
 * Presses one key. The rotors turn first, then the current goes from the key through the plugboard,
 * the right, middle and left rotors, the reflector, the same rotors backwards, and the plugboard
 * again, to a lamp. Call `checkSettings` before: this function trusts the settings.
 */
export function press(state: EnigmaState, key: Letter): Press {
  const { settings } = state;
  const positions = stepRotors(settings.rotors, state.positions);
  const path: PathPoint[] = [{ part: 'key', letter: key }];
  const add = (part: PathPart, letter: Letter) => {
    path.push({ part, letter });
    return letter;
  };

  let letter = add('plugboard', plug(settings.plugs, key));
  const slots = [
    [2, 'right'],
    [1, 'middle'],
    [0, 'left'],
  ] as const;
  for (const [slot, part] of slots) {
    letter = add(part, throughRotor(settings.rotors[slot], settings.rings[slot], positions[slot], letter, false));
  }
  letter = add('reflector', wiredTo(REFLECTORS[settings.reflector], letter));
  for (const [slot, part] of [...slots].reverse()) {
    letter = add(part, throughRotor(settings.rotors[slot], settings.rings[slot], positions[slot], letter, true));
  }
  const lamp = add('plugboard', plug(settings.plugs, letter));
  return { state: { settings, positions }, lamp, path };
}

/** The lamps that light when `text` is typed from the windows `start`. */
export function encrypt(settings: EnigmaSettings, start: Positions, text: string): string {
  let state: EnigmaState = { settings, positions: start };
  let lamps = '';
  for (const character of text) {
    if (!isLetter(character)) throw new Error(`Enigma has no key for "${character}"`);
    const result = press(state, character);
    state = result.state;
    lamps += result.lamp;
  }
  return lamps;
}
