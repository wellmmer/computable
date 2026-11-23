import { describe, expect, it } from 'vitest';
import { LAB_M4_SETTINGS, LAB_SETTINGS } from './lab-state';
import { ringsText, rotorsText, startText } from './machine-facts';

describe('the facts of a machine, left to right (spec R5a 3)', () => {
  it('writes the Enigma I rotors, rings and start as before', () => {
    expect([rotorsText(LAB_SETTINGS), ringsText(LAB_SETTINGS), startText(LAB_SETTINGS, ['B', 'L', 'A'])]).toEqual(['I II III', 'A A A', 'B L A']);
  });

  it('puts the M4 thin rotor first, as it sits leftmost in the machine', () => {
    const settings = { ...LAB_M4_SETTINGS, thinRotor: 'Gamma', thinRing: 'C', thinPosition: 'U' } as const;
    expect([rotorsText(settings), ringsText(settings), startText(settings, ['N', 'A', 'V'])]).toEqual(['Gamma I II III', 'C A A A', 'U N A V']);
  });
});
