import { describe, expect, it } from 'vitest';
import { buildMenu, crashes, createTester, scramblerTables, searchOrder, startIndex, testStart } from '@/engines/bombe';
import { checkSettings, encrypt } from '@/engines/enigma';
import { PRACTICE } from './practice-message';

const menu = buildMenu(PRACTICE.cipher, PRACTICE.crib, PRACTICE.offset);

describe('the practice message (spec R4 3)', () => {
  it('is a real Enigma I message: 3 of rotors I to V, rings A A A, reflector B, 10 plug pairs', () => {
    expect(checkSettings(PRACTICE.settings)).toEqual([]);
    expect(PRACTICE.settings.plugs).toHaveLength(10);
    expect(encrypt(PRACTICE.settings, PRACTICE.start, PRACTICE.plain)).toBe(PRACTICE.cipher);
    expect(PRACTICE.plain.slice(PRACTICE.offset, PRACTICE.offset + PRACTICE.crib.length)).toBe(PRACTICE.crib);
  });

  it('has a crib without crashes and a menu with 3 loops in one group', () => {
    expect(crashes(PRACTICE.cipher, PRACTICE.crib, PRACTICE.offset)).toEqual([]);
    expect(menu.loops).toBe(3);
    // One group: links − letters + 1 loops.
    expect(menu.links.length - menu.letters.length + 1).toBe(3);
  });

  it('gives exactly one stop in its rotor order: the key, with 7 of its 10 plug pairs', () => {
    const stops = searchOrder(PRACTICE.settings.rotors, menu);
    expect(stops).toEqual([{ rotors: ['II', 'III', 'V'], start: ['Q', 'K', 'A'], plugs: ['AH', 'BP', 'EX', 'KW', 'MR', 'NT', 'VZ'] }]);
  });

  it('lights the crib at its place when the stop is loaded into the Enigma engine', () => {
    const [stop] = testStart(createTester(scramblerTables(PRACTICE.settings.rotors), menu), startIndex(PRACTICE.start));
    const lamps = encrypt({ ...PRACTICE.settings, plugs: stop.plugs }, stop.start, PRACTICE.cipher);
    expect(lamps.slice(PRACTICE.offset, PRACTICE.offset + PRACTICE.crib.length)).toBe(PRACTICE.crib);
  });
});
