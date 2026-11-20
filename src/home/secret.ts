import { encrypt, type EnigmaSettings, type Positions } from '@/engines/enigma';
import { LAB_SETTINGS, LAB_START } from '@/enigma/lab-state';

/** Home's small Enigma uses the lab's first settings, so the lab decrypts a secret without changes. */
export const HOME_SETTINGS: EnigmaSettings = LAB_SETTINGS;
export const HOME_START: Positions = LAB_START;

/** Joined letters that have no accent to drop. Each one becomes the two letters it is written for. */
const TWO_LETTERS: Readonly<Record<string, string>> = { Œ: 'OE', Æ: 'AE', ẞ: 'SS' };

/**
 * What Enigma can type of a text: capitals without accents, X for each space, and nothing else.
 * "Olá, mundo!" → "OLAXMUNDO", "cœur" → "COEUR". Digits and signs are left out.
 */
export function toEnigmaLetters(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toUpperCase()
    .replace(/[ŒÆẞ]/g, (letter) => TWO_LETTERS[letter])
    .replace(/[^A-Z\s]/g, '')
    .trim()
    .replace(/\s+/g, 'X');
}

/** The letters Enigma types for `plain`, and the lamps they light from Home's start. */
export function encryptSecret(plain: string): { letters: string; cipher: string } {
  const letters = toEnigmaLetters(plain);
  return { letters, cipher: encrypt(HOME_SETTINGS, HOME_START, letters) };
}
