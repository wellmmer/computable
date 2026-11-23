import { describe, expect, it } from 'vitest';
import { checkSettings, encrypt, isM4 } from '@/engines/enigma';
import { routing } from '@/i18n/routing';
import { lettersOf } from './key-sheet';
import { practiceM4Message, practiceMessages, readable } from './practice-messages';

describe('the practice messages (spec R3 4)', () => {
  it.each(routing.locales)('in %s, each key sheet decrypts to the answer', (locale) => {
    for (const sheet of practiceMessages(locale)) {
      expect(checkSettings(sheet.settings)).toEqual([]);
      expect(encrypt(sheet.settings, sheet.start, lettersOf(sheet.cipher))).toBe(sheet.answer);
    }
  });

  it.each(routing.locales)('in %s, the answers use only the 26 letters, with X between words and no X inside a word', (locale) => {
    for (const { answer } of practiceMessages(locale)) {
      expect(answer).toMatch(/^[A-WYZ]+(X[A-WYZ]+)*$/);
    }
  });

  it('gets harder: no plug pairs, then plug pairs, then plug pairs and ring settings', () => {
    const [first, second, third] = practiceMessages('en').map(({ settings }) => settings);
    expect([first.plugs.length, first.rings.join('')]).toEqual([0, 'AAA']);
    expect([second.plugs.length, second.rings.join('')]).toEqual([4, 'AAA']);
    expect([third.plugs.length, third.rings.join('')]).toEqual([4, 'FUN']);
  });

  it('shows the answer with spaces for X', () => {
    expect(readable('HELLOXFROMXBLETCHLEYXPARK')).toBe('HELLO FROM BLETCHLEY PARK');
  });
});

describe('practice 4, the naval M4 (spec R5a 3)', () => {
  it.each(routing.locales)('in %s, its key sheet decrypts to the answer, with X only between words', (locale) => {
    const sheet = practiceM4Message(locale);
    expect(checkSettings(sheet.settings)).toEqual([]);
    expect(encrypt(sheet.settings, sheet.start, lettersOf(sheet.cipher))).toBe(sheet.answer);
    expect(sheet.answer).toMatch(/^[A-WYZ]+(X[A-WYZ]+)*$/);
  });

  it('uses the same M4 key in every language: Gamma at U, rotors II IV VIII, thin reflector C, 4 plug pairs, start N A V', () => {
    for (const locale of routing.locales) {
      const { settings, start } = practiceM4Message(locale);
      expect(isM4(settings)).toBe(true);
      expect({ settings, start }).toEqual({
        settings: { model: 'M4', thinRotor: 'Gamma', thinRing: 'A', thinPosition: 'U', rotors: ['II', 'IV', 'VIII'], rings: ['A', 'A', 'A'], reflector: 'C', plugs: ['AT', 'BL', 'EN', 'GR'] },
        start: ['N', 'A', 'V'],
      });
    }
  });
});
