import { isM4, type MachineSettings, type Positions } from '@/engines/enigma';

/** "Beta I II III": the rotor names, left to right. The M4's thin rotor sits leftmost. */
export function rotorsText(settings: MachineSettings): string {
  return (isM4(settings) ? [settings.thinRotor, ...settings.rotors] : settings.rotors).join(' ');
}

/** "A A A A": the ring settings, left to right, the thin rotor's first on the M4. */
export function ringsText(settings: MachineSettings): string {
  return (isM4(settings) ? [settings.thinRing, ...settings.rings] : settings.rings).join(' ');
}

/** "A B L A": the window letters at the start, left to right. The M4's thin rotor keeps its letter. */
export function startText(settings: MachineSettings, start: Positions): string {
  return (isM4(settings) ? [settings.thinPosition, ...start] : start).join(' ');
}
