import { describe, expect, it } from 'vitest';
import { checkAnswer, lettersOf } from './key-sheet';

describe('lettersOf', () => {
  it('keeps the letters only, in capitals', () => {
    expect(lettersOf('RFUGZ edpud\nNRGYS, 1840')).toBe('RFUGZEDPUDNRGYS');
  });
});

describe('checkAnswer ("Check my answer")', () => {
  it('asks for letters first', () => {
    expect(checkAnswer('', 'HELLO')).toEqual({ result: 'empty' });
  });

  it('says right when every letter matches', () => {
    expect(checkAnswer('HELLO', 'HELLO')).toEqual({ result: 'right' });
  });

  it('counts the right letters while the visitor is still typing', () => {
    expect(checkAnswer('HEL', 'HELLO')).toEqual({ result: 'so-far', right: 3, total: 5 });
  });

  it('names the first wrong letter, counting from 1', () => {
    expect(checkAnswer('HELP', 'HELLO')).toEqual({ result: 'wrong', at: 4 });
  });

  it('calls a letter after the end wrong', () => {
    expect(checkAnswer('HELLOS', 'HELLO')).toEqual({ result: 'wrong', at: 6 });
  });
});
