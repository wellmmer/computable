import { encrypt } from '@/engines/enigma';
import type { SecretKey } from './random-key';

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

/** The letters Enigma types for `plain`, and the lamps they light with the secret's key. */
export function encryptSecret(plain: string, { settings, start }: SecretKey): { letters: string; cipher: string } {
  const letters = toEnigmaLetters(plain);
  return { letters, cipher: encrypt(settings, start, letters) };
}
