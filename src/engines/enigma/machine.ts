import {
  indexOf,
  isLetter,
  letterAt,
  REFLECTORS,
  ROTORS,
  THIN_REFLECTORS,
  THIN_ROTORS,
  type Letter,
  type ReflectorName,
  type RotorName,
  type ThinReflectorName,
  type ThinRotorName,
} from './parts';

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
  /** Never set. It stops M4 settings, which have the same other fields, from passing as Enigma I settings. */
  model?: never;
}

export type MachineModel = 'I' | 'M4';

/**
 * How a naval M4 is set up (spec R5a 2). The thin rotor sits left of the left rotor and never
 * turns, so its window letter is part of the settings and `Positions` keeps 3 letters.
 */
export interface M4Settings {
  model: 'M4';
  thinRotor: ThinRotorName;
  thinRing: Letter;
  /** The letter in the thin rotor's window. It stays the same for the whole message. */
  thinPosition: Letter;
  /** The left, middle and right rotor: the 3 rotors that turn. */
  rotors: Three<RotorName>;
  rings: Three<Letter>;
  /** A thin reflector. */
  reflector: ThinReflectorName;
  plugs: readonly string[];
}

/** The Enigma I (settings without `model`) or the naval M4. */
export type MachineSettings = EnigmaSettings | M4Settings;

export function isM4(settings: MachineSettings): settings is M4Settings {
  return settings.model === 'M4';
}

export function modelOf(settings: MachineSettings): MachineModel {
  return isM4(settings) ? 'M4' : 'I';
}

export interface EnigmaState<S extends MachineSettings = EnigmaSettings> {
  settings: S;
  positions: Positions;
}

/**
 * The parts the current passes, in the order of the spec (R3 2): out to the reflector and back. The
 * M4 adds its thin rotor between the left rotor and the reflector (spec R5a 2).
 */
export type PathPart = 'key' | 'plugboard' | 'right' | 'middle' | 'left' | 'thin' | 'reflector';

export interface PathPoint {
  part: PathPart;
  /** The letter after this part. */
  letter: Letter;
}

export interface Press<S extends MachineSettings = EnigmaSettings> {
  /** The state after the key press: only the rotor windows change. */
  state: EnigmaState<S>;
  /** The lamp that lights. */
  lamp: Letter;
  /**
   * The letter after each part: key, plugboard, right, middle, left, reflector, left, middle, right,
   * plugboard. The M4 adds "thin" before and after the reflector.
   */
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

/** One rotor with this wiring, from right to left (`back` false) or from left to right (`back` true). */
function throughRotor(wiring: string, ring: Letter, position: Letter, letter: Letter, back: boolean): Letter {
  const shift = indexOf(position) - indexOf(ring);
  const contact = letterAt(indexOf(letter) + shift);
  const out = back ? wiring.indexOf(contact) : indexOf(wiredTo(wiring, contact));
  return letterAt(out - shift);
}

/**
 * Presses one key. The rotors turn first, then the current goes from the key through the plugboard,
 * the right, middle and left rotors, the reflector, the same rotors backwards, and the plugboard
 * again, to a lamp. On the M4 it also goes through the thin rotor, just before and just after the
 * thin reflector. Call `checkSettings` before: this function trusts the settings.
 */
export function press<S extends MachineSettings>(state: EnigmaState<S>, key: Letter): Press<S> {
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
    letter = add(part, throughRotor(ROTORS[settings.rotors[slot]].wiring, settings.rings[slot], positions[slot], letter, false));
  }
  if (isM4(settings)) {
    const thin = (back: boolean) => add('thin', throughRotor(THIN_ROTORS[settings.thinRotor], settings.thinRing, settings.thinPosition, letter, back));
    letter = thin(false);
    letter = add('reflector', wiredTo(THIN_REFLECTORS[settings.reflector], letter));
    letter = thin(true);
  } else {
    letter = add('reflector', wiredTo(REFLECTORS[settings.reflector], letter));
  }
  for (const [slot, part] of [...slots].reverse()) {
    letter = add(part, throughRotor(ROTORS[settings.rotors[slot]].wiring, settings.rings[slot], positions[slot], letter, true));
  }
  const lamp = add('plugboard', plug(settings.plugs, letter));
  return { state: { settings, positions }, lamp, path };
}

/** The lamps that light when `text` is typed from the windows `start`. */
export function encrypt(settings: MachineSettings, start: Positions, text: string): string {
  let state: EnigmaState<MachineSettings> = { settings, positions: start };
  let lamps = '';
  for (const character of text) {
    if (!isLetter(character)) throw new Error(`Enigma has no key for "${character}"`);
    const result = press(state, character);
    state = result.state;
    lamps += result.lamp;
  }
  return lamps;
}
