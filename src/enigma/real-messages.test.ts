import { describe, expect, it } from 'vitest';
import { checkSettings, encrypt, isM4 } from '@/engines/enigma';
import { lettersOf } from './key-sheet';
import { REAL_MESSAGES } from './real-messages';

const PARTS = REAL_MESSAGES.flatMap(({ id, parts }) => parts.map((part, i) => ({ name: `${id}, part ${i + 1}`, part })));

describe('the real messages (spec R3 4: checked against published sources on 2026-11-20)', () => {
  it.each(PARTS)('$name decrypts to the published plain text', ({ part }) => {
    expect(encrypt(part.settings, part.start, lettersOf(part.cipher))).toBe(part.answer);
    expect(lettersOf(part.published)).toBe(part.answer);
  });

  it.each(PARTS)('$name has settings a real Enigma allows', ({ part }) => {
    expect(checkSettings(part.settings)).toEqual([]);
  });

  it('gives each Barbarossa part the length in its header: 179 and 155 letters with the key group', () => {
    // Weierud's overview lists RFUGZ 179/174 and FNJAU 155/150. The Rijmenants PDF cuts part 2 short, so the page links the overview.
    expect(REAL_MESSAGES[0].sources.map(({ url }) => url)).toContain('https://cryptocellar.org/bgac/1941-msg-list.html');
    const [first, second] = REAL_MESSAGES[0].parts;
    expect(lettersOf(first.keyGroup + first.cipher)).toHaveLength(179);
    expect(lettersOf(second.keyGroup + second.cipher)).toHaveLength(155);
  });

  it('finds each Barbarossa start the way the operator sent it: W X C and K C H give B L A, C R S and Y P J give L S D', () => {
    for (const part of REAL_MESSAGES[0].parts) {
      if (part.hiddenStart === null) throw new Error('Barbarossa sends its start');
      expect(encrypt(part.settings, part.hiddenStart.from, part.hiddenStart.typed)).toBe(part.start.join(''));
    }
  });

  it('lists the messages in the order they were sent: 1941, 1942, 1943', () => {
    expect(REAL_MESSAGES.map(({ id }) => id)).toEqual(['barbarossa', 'u264', 'scharnhorst']);
  });
});

describe('the U-264 message (spec R5a 4: checked against the M4 Project on 2026-11-23)', () => {
  const u264 = REAL_MESSAGES.find(({ id }) => id === 'u264');

  it('uses the naval M4 with the key the M4 Project found: Beta, II IV I, thin B, rings A A A V, start V J N A', () => {
    if (u264 === undefined) throw new Error('U-264 is missing');
    const [part] = u264.parts;
    expect(u264.parts).toHaveLength(1);
    expect(isM4(part.settings)).toBe(true);
    expect({ settings: part.settings, start: part.start }).toEqual({
      settings: {
        model: 'M4',
        thinRotor: 'Beta',
        thinRing: 'A',
        thinPosition: 'V',
        rotors: ['II', 'IV', 'I'],
        rings: ['A', 'A', 'V'],
        reflector: 'B',
        plugs: ['AT', 'BL', 'DF', 'GJ', 'HM', 'NW', 'OP', 'QY', 'RZ', 'VX'],
      },
      start: ['J', 'N', 'A'],
    });
  });

  it('has 58 groups of 4 secret letters, and no key group: the M4 Project removed it', () => {
    if (u264 === undefined) throw new Error('U-264 is missing');
    const [part] = u264.parts;
    expect(part.cipher.split(' ')).toHaveLength(58);
    expect(part.cipher.split(' ').every((group) => group.length === 4)).toBe(true);
    expect(part.keyGroup).toBeNull();
    expect(part.answer).toHaveLength(232);
  });

  it('says only "November 1942" for the date, because the sources do not agree on the day', () => {
    expect(u264?.date).toBe('1942-11');
  });

  it('links the M4 Project and uboat.net', () => {
    expect(u264?.sources.map(({ url }) => url)).toEqual([
      'https://www.bytereef.org/m4_project.html',
      'https://www.bytereef.org/m4-project-first-break.html',
      'https://uboat.net/boats/u264.htm',
    ]);
  });
});
