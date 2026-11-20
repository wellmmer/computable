import { describe, expect, it } from 'vitest';
import { encryptSecret, HOME_SETTINGS, HOME_START, toEnigmaLetters } from './secret';

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
  it('uses the lab’s first settings, so the lab decrypts the secret without changes', () => {
    expect(HOME_SETTINGS).toEqual({
      rotors: ['I', 'II', 'III'],
      rings: ['A', 'A', 'A'],
      reflector: 'B',
      plugs: ['AV', 'BS', 'CG', 'DL', 'FU', 'HZ', 'IN', 'KM', 'OW', 'RX'],
    });
    expect(HOME_START).toEqual(['B', 'L', 'A']);
  });

  it('turns "Wetterbericht" into PBJGOLIZQMQGZ, like the lab', () => {
    expect(encryptSecret('Wetterbericht')).toEqual({ letters: 'WETTERBERICHT', cipher: 'PBJGOLIZQMQGZ' });
  });
});
