import { describe, expect, it } from 'vitest';
import { PRACTICE } from '@/bombe/practice-message';
import { encryptSecret, toEnigmaLetters } from './secret';

describe('toEnigmaLetters (Enigma has only 26 letters)', () => {
  it('writes capitals, drops accents, and types X for each space', () => {
    expect(toEnigmaLetters('Olá, mundo!')).toBe('OLAXMUNDO');
    expect(toEnigmaLetters('Ça va? Señor Weiß')).toBe('CAXVAXSENORXWEISS');
  });

  it('writes the joined letters œ, æ and ß as two letters', () => {
    expect(toEnigmaLetters('cœur')).toBe('COEUR');
    expect(toEnigmaLetters('Œuvre, Æsop, ægide')).toBe('OEUVREXAESOPXAEGIDE');
    expect(toEnigmaLetters('Straße, STRAẞE')).toBe('STRASSEXSTRASSE');
  });

  it('leaves out digits and signs, and spaces at the ends', () => {
    expect(toEnigmaLetters('  Turing 1912 ')).toBe('TURING');
    expect(toEnigmaLetters('a - b')).toBe('AXB');
    expect(toEnigmaLetters('123 ?!')).toBe('');
  });
});

describe('encryptSecret', () => {
  it('encrypts with the secret’s own key', () => {
    // The key every secret got before R4b: the lab's first settings.
    const r3Key = { settings: { rotors: ['I', 'II', 'III'], rings: ['A', 'A', 'A'], reflector: 'B', plugs: ['AV', 'BS', 'CG', 'DL', 'FU', 'HZ', 'IN', 'KM', 'OW', 'RX'] }, start: ['B', 'L', 'A'] } as const;
    expect(encryptSecret('Wetterbericht', r3Key)).toEqual({ letters: 'WETTERBERICHT', cipher: 'PBJGOLIZQMQGZ' });
    expect(encryptSecret('Wetterbericht', { settings: PRACTICE.settings, start: PRACTICE.start })).toEqual({ letters: 'WETTERBERICHT', cipher: 'HXHICIRWHZRQW' });
  });
});
