import { describe, expect, it } from 'vitest';
import { parseTryHash, tryHash, type KeyToTry } from './try-link';

const STOP: KeyToTry = {
  settings: { rotors: ['II', 'III', 'V'], rings: ['A', 'A', 'A'], reflector: 'B', plugs: ['AH', 'BP'] },
  start: ['Q', 'K', 'A'],
  cipher: 'HXHICIRWHZ',
};

describe('the Enigma lab link for a Bombe stop (spec R4 3, "Try in the Enigma lab")', () => {
  it('writes the rotors, start, plug pairs and secret letters in the hash', () => {
    expect(tryHash(STOP)).toBe('#rotors=II-III-V&start=QKA&plugs=AH-BP&secret=HXHICIRWHZ');
  });

  it('reads back what it writes, with rings A A A and reflector B', () => {
    expect(parseTryHash(tryHash(STOP))).toEqual(STOP);
    const noPlugs = { ...STOP, settings: { ...STOP.settings, plugs: [] } };
    expect(parseTryHash(tryHash(noPlugs))).toEqual(noPlugs);
  });

  it('reads nothing from other hashes, or from a key the lab does not allow', () => {
    for (const hash of [
      '',
      '#m=abc',
      '#rotors=II-III&start=QKA&plugs=&secret=ABC',
      '#rotors=II-II-V&start=QKA&plugs=&secret=ABC',
      '#rotors=II-III-V&start=QK&plugs=&secret=ABC',
      '#rotors=II-III-V&start=QKA&plugs=AH-AB&secret=ABC',
      '#rotors=II-III-V&start=QKA&plugs=&secret=',
      '#rotors=II-III-V&start=QKA&plugs=&secret=ab1',
    ]) {
      expect(parseTryHash(hash), hash).toBeNull();
    }
  });
});
