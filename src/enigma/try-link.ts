import { checkSettings, isLetter, ROTOR_NAMES, type EnigmaSettings, type Letter, type Positions, type RotorName } from '@/engines/enigma';

/**
 * A key and secret letters that another page hands to the Enigma lab, such as a Bombe stop. The
 * Bombe assumes rings A A A and reflector B, so the link holds only the rotors, start and plug pairs.
 */
export interface KeyToTry {
  settings: EnigmaSettings;
  start: Positions;
  /** The secret letters, without spaces. */
  cipher: string;
}

/** "#rotors=II-III-V&start=QKA&plugs=AH-BP&secret=HXHIC…": the hash of an Enigma lab link that loads a key. */
export function tryHash({ settings, start, cipher }: KeyToTry): string {
  const params = new URLSearchParams({ rotors: settings.rotors.join('-'), start: start.join(''), plugs: settings.plugs.join('-'), secret: cipher });
  return `#${params}`;
}

const isRotorName = (name: string): name is RotorName => (ROTOR_NAMES as readonly string[]).includes(name);

/** Reads the hash of an Enigma lab link. Anything that is not a key the lab allows reads as null. */
export function parseTryHash(hash: string): KeyToTry | null {
  if (!hash.startsWith('#rotors=')) return null;
  const params = new URLSearchParams(hash.slice(1));
  const rotors = (params.get('rotors') ?? '').split('-');
  const start = [...(params.get('start') ?? '')];
  const plugsText = params.get('plugs') ?? '';
  const cipher = params.get('secret') ?? '';
  if (rotors.length !== 3 || !rotors.every(isRotorName)) return null;
  if (start.length !== 3 || !start.every(isLetter)) return null;
  if (!/^[A-Z]+$/.test(cipher)) return null;

  const [left, middle, right] = rotors;
  const [first, second, third]: Letter[] = start;
  const settings: EnigmaSettings = { rotors: [left, middle, right], rings: ['A', 'A', 'A'], reflector: 'B', plugs: plugsText === '' ? [] : plugsText.split('-') };
  if (checkSettings(settings).length > 0) return null;
  return { settings, start: [first, second, third], cipher };
}
