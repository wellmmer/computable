import { describe, expect, it } from 'vitest';
import type { Stop } from '@/engines/bombe';
import { PRACTICE } from './practice-message';
import { isYourKey } from './your-key';

const KEY = { settings: PRACTICE.settings, start: PRACTICE.start };
const STOP: Stop = { rotors: ['II', 'III', 'V'], start: ['Q', 'K', 'A'], plugs: ['AH', 'BP', 'EX', 'KW', 'MR', 'NT', 'VZ'] };

describe('isYourKey (spec R4 4, "This is your key")', () => {
  it('matches a stop with the key’s rotor order and start, whose plug pairs are all in the key', () => {
    expect(isYourKey(STOP, KEY)).toBe(true);
    expect(isYourKey({ ...STOP, plugs: [] }, KEY)).toBe(true);
  });

  it('reads a key pair in either order', () => {
    expect(isYourKey(STOP, { ...KEY, settings: { ...KEY.settings, plugs: KEY.settings.plugs.map((pair) => [...pair].reverse().join('')) } })).toBe(true);
  });

  it('does not match another rotor order, another start, or a pair the key does not have', () => {
    expect(isYourKey({ ...STOP, rotors: ['II', 'V', 'III'] }, KEY)).toBe(false);
    expect(isYourKey({ ...STOP, start: ['Q', 'K', 'B'] }, KEY)).toBe(false);
    expect(isYourKey({ ...STOP, plugs: [...STOP.plugs, 'CG'] }, KEY)).toBe(false);
  });
});
