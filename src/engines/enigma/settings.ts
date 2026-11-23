import type { MachineSettings } from './machine';
import { isLetter } from './parts';

/** The most plug pairs a plugboard can hold: 26 letters make 13 pairs. */
export const MAX_PLUG_PAIRS = 13;

export interface SettingsError {
  /** The field the lab shows the error next to. */
  field: 'rotors' | 'plugs';
  problem: 'same-rotor' | 'letter-twice' | 'too-many-pairs' | 'not-a-pair';
  /** What is wrong: the rotor or letter used twice, the number of pairs, or the pair itself. */
  letters: string;
}

/** The reasons these settings cannot go on a real Enigma I or M4, or none. The M4's thin parts have no such limits. */
export function checkSettings({ rotors, plugs }: MachineSettings): SettingsError[] {
  const errors: SettingsError[] = [];

  const twice = rotors.find((rotor, i) => rotors.indexOf(rotor) !== i);
  if (twice !== undefined) errors.push({ field: 'rotors', problem: 'same-rotor', letters: twice });

  if (plugs.length > MAX_PLUG_PAIRS) errors.push({ field: 'plugs', problem: 'too-many-pairs', letters: String(plugs.length) });
  const seen = new Set<string>();
  for (const pair of plugs) {
    const [a, b] = pair;
    if (pair.length !== 2 || !isLetter(a) || !isLetter(b) || a === b) {
      errors.push({ field: 'plugs', problem: 'not-a-pair', letters: pair });
      continue;
    }
    for (const letter of [a, b]) {
      if (seen.has(letter) && !errors.some((error) => error.problem === 'letter-twice')) {
        errors.push({ field: 'plugs', problem: 'letter-twice', letters: letter });
      }
      seen.add(letter);
    }
  }
  return errors;
}
