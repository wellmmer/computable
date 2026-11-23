import { describe, expect, it } from 'vitest';
import { buildMenu, crashes, ROTOR_ORDERS, searchOrder, type Stop } from '@/engines/bombe';
import { encrypt, type EnigmaSettings } from '@/engines/enigma';
import { REAL_MESSAGES } from '@/enigma/real-messages';
import { BARBAROSSA, BARBAROSSA_PART_1 } from './barbarossa';

const menu = buildMenu(BARBAROSSA.cipher, BARBAROSSA.crib, BARBAROSSA.offset);
const cribEnd = BARBAROSSA.offset + BARBAROSSA.crib.length;

/** The one stop the search finds. Measured on 2026-11-23. */
const STOP: Stop = { rotors: ['II', 'IV', 'V'], start: ['A', 'Q', 'P'], plugs: ['AV', 'BS', 'CG', 'DL', 'FU', 'HZ', 'IN', 'OW', 'RX'] };

/** A key with rings A A A, as the Bombe assumes. */
const ringsAAA = (plugs: readonly string[]): EnigmaSettings => ({ rotors: STOP.rotors, rings: ['A', 'A', 'A'], reflector: 'B', plugs });

describe('Barbarossa part 1 on the Bombe (spec R4 5)', () => {
  it('is part 1 of the real Barbarossa message', () => {
    expect(BARBAROSSA_PART_1).toBe(REAL_MESSAGES.find(({ id }) => id === 'barbarossa')?.parts[0]);
    expect(BARBAROSSA.cipher).toHaveLength(174);
  });

  it('takes its crib from the known plain text, at a place without crashes, with 16 links and 1 loop', () => {
    expect(BARBAROSSA_PART_1.answer.slice(BARBAROSSA.offset, cribEnd)).toBe(BARBAROSSA.crib);
    expect(crashes(BARBAROSSA.cipher, BARBAROSSA.crib, BARBAROSSA.offset)).toEqual([]);
    expect(menu.links).toHaveLength(16);
    expect(menu.loops).toBe(1);
    expect(menu.center).toBe('E');
  });

  it('gives one stop in the real rotor order: II IV V at A Q P, with 9 of the 10 real plug pairs', () => {
    expect(searchOrder(BARBAROSSA_PART_1.settings.rotors, menu)).toEqual([STOP]);
    expect(BARBAROSSA.foundStart).toEqual(STOP.start);
    for (const pair of STOP.plugs) expect(BARBAROSSA_PART_1.settings.plugs).toContain(pair);
  });

  it('gives that one stop and no other in all 60 rotor orders', () => {
    expect(ROTOR_ORDERS.flatMap((rotors) => searchOrder(rotors, menu))).toEqual([STOP]);
  }, 60_000);

  it('cannot find the real start B L A: with rings A A A, the middle rotor turns at other letters', () => {
    const real = encrypt(BARBAROSSA_PART_1.settings, BARBAROSSA_PART_1.start, BARBAROSSA.cipher);
    // The real start turned back by the rings B U L: B − B = A, L − U = R, A − L = P.
    const turnedBack = encrypt(ringsAAA(BARBAROSSA_PART_1.settings.plugs), ['A', 'R', 'P'], BARBAROSSA.cipher);
    // Both read the first 10 letters. Then the middle rotor turns with rings A A A, and not on the real machine.
    expect(turnedBack.slice(0, 10)).toBe(real.slice(0, 10));
    expect(turnedBack.slice(10, 25)).not.toBe(real.slice(10, 25));
    // The crib sits after that turn, so the Bombe finds the middle rotor one letter back: Q, not R.
    const found = encrypt(ringsAAA(BARBAROSSA_PART_1.settings.plugs), BARBAROSSA.foundStart, BARBAROSSA.cipher);
    expect(found.slice(BARBAROSSA.offset, cribEnd)).toBe(BARBAROSSA.crib);
  });

  it('lights the crib with the stop key, and reads 92 of the 174 letters, in blocks', () => {
    const lamps = encrypt(ringsAAA(STOP.plugs), STOP.start, BARBAROSSA.cipher);
    expect(lamps.slice(BARBAROSSA.offset, cribEnd)).toBe(BARBAROSSA.crib);
    expect([...lamps].filter((letter, i) => letter === BARBAROSSA_PART_1.answer[i])).toHaveLength(92);
    // Letters 10 to 22 read. Letters 26 to 36 do not: there the middle rotor stands one letter off.
    expect(lamps.slice(9, 22)).toBe('EILUNGXVONXKU');
    for (let i = 25; i < 36; i++) expect(lamps[i], `letter ${i + 1}`).not.toBe(BARBAROSSA_PART_1.answer[i]);
  });
});
