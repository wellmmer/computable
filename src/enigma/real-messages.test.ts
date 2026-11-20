import { describe, expect, it } from 'vitest';
import { checkSettings, encrypt } from '@/engines/enigma';
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
});
