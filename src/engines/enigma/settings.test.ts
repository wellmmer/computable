import { describe, expect, it } from 'vitest';
import type { EnigmaSettings } from './machine';
import { checkSettings } from './settings';

const LAB: EnigmaSettings = {
  rotors: ['I', 'II', 'III'],
  rings: ['A', 'A', 'A'],
  reflector: 'B',
  plugs: ['AV', 'BS', 'CG', 'DL', 'FU', 'HZ', 'IN', 'KM', 'OW', 'RX'],
};

describe('checkSettings (spec R3 2, "Settings check")', () => {
  it('accepts the lab settings, and no plug pairs at all', () => {
    expect(checkSettings(LAB)).toEqual([]);
    expect(checkSettings({ ...LAB, plugs: [] })).toEqual([]);
  });

  it('refuses the same rotor twice', () => {
    expect(checkSettings({ ...LAB, rotors: ['I', 'III', 'I'] })).toEqual([{ field: 'rotors', problem: 'same-rotor', letters: 'I' }]);
  });

  it('refuses a letter in two plug pairs', () => {
    expect(checkSettings({ ...LAB, plugs: ['AV', 'BS', 'AX'] })).toEqual([{ field: 'plugs', problem: 'letter-twice', letters: 'A' }]);
  });

  it('refuses more than 13 plug pairs', () => {
    const fourteen = ['AB', 'CD', 'EF', 'GH', 'IJ', 'KL', 'MN', 'OP', 'QR', 'ST', 'UV', 'WX', 'YZ', 'AZ'];
    expect(checkSettings({ ...LAB, plugs: fourteen })).toContainEqual({ field: 'plugs', problem: 'too-many-pairs', letters: '14' });
  });

  it('refuses a plug pair that is not 2 different letters from A to Z', () => {
    for (const pair of ['AA', 'A', 'ABC', 'a1']) {
      expect(checkSettings({ ...LAB, plugs: [pair] }), pair).toEqual([{ field: 'plugs', problem: 'not-a-pair', letters: pair }]);
    }
  });
});
