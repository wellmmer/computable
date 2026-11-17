import { describe, expect, it } from 'vitest';
import turingFirst from '../../../examples/turing-1936-first.json';
import { standardDescription } from './standard-description';
import { fromJson, machine } from './test-helpers';

describe('standardDescription (Turing 1936, section 5)', () => {
  const first = fromJson(turingFirst);

  it('starts the rules of the first machine with its start state, so 𝔟 is q1 (p. 239)', () => {
    expect(first.start).toBe(first.rules[0].state);
  });

  it('numbers the states and symbols of the first machine as Turing does on p. 241', () => {
    const { states, lines } = standardDescription(first);
    expect(states).toEqual(['𝔟', '𝔠', '𝔢', '𝔨']);
    expect(lines.map((line) => line.standardForm)).toEqual(['q1 S0 S1 R q2', 'q2 S0 S0 R q3', 'q3 S0 S2 R q4', 'q4 S0 S0 R q1']);
  });

  it('gives the standard description that Turing prints on p. 241', () => {
    const { sd, lines } = standardDescription(first);
    expect(sd).toBe('DADDCRDAA;DAADDRDAAA;DAAADDCCRDAAAA;DAAAADDRDA;');
    expect(lines.map((line) => line.sd)).toEqual(['DADDCRDAA;', 'DAADDRDAAA;', 'DAAADDCCRDAAAA;', 'DAAAADDRDA;']);
  });

  it('gives the description number that Turing prints on p. 241, 47 digits', () => {
    const { dn, lines } = standardDescription(first);
    expect(dn).toBe('31332531173113353111731113322531111731111335317');
    expect(dn).toHaveLength(47);
    expect(lines.map((line) => line.dn).join('')).toBe(dn);
  });

  it('gives the longer number of p. 241 when the irrelevant line q1 S1 PS1, R q2 is added', () => {
    const extra = { ...first, rules: [...first.rules, { state: '𝔟', read: '0', ops: ['P0', 'R'], next: '𝔠' }] };
    expect(standardDescription(extra).dn).toBe('3133253117311335311173111332253111173111133531731323253117');
  });

  it('writes E as printing a blank, and a missing move as N (p. 240)', () => {
    const { lines } = standardDescription(
      machine([{ state: 'q0', read: '1', ops: ['E'], next: 'q0' }], { start: 'q0', blank: '_', notation: 'turing1936' }),
    );
    expect(lines[0]).toMatchObject({ standardForm: 'q1 S2 S0 N q1', sd: 'DADCCDNDA;', dn: '3132236317' });
  });

  it('writes a modern rule as a print and a move, and the move S as N', () => {
    const rules = [
      { state: 'q0', read: '0', write: '1', move: 'R' as const, next: 'q0' },
      { state: 'q0', read: '_', write: '_', move: 'S' as const, next: 'qA' },
    ];
    expect(standardDescription(machine(rules)).lines.map((line) => line.standardForm)).toEqual(['q1 S1 S2 R q1', 'q1 S0 S0 N q2']);
  });

  it('refuses a rule it cannot write in one line, such as two moves', () => {
    expect(() => standardDescription(machine([{ state: 'q0', read: { match: 'blank' }, ops: ['R', 'R'], next: 'q0' }], { start: 'q0' }))).toThrow(
      'rule 1 cannot be written as one line of a standard description: R, R',
    );
  });

  it('refuses a rule that reads "any symbol"', () => {
    expect(() => standardDescription(machine([{ state: 'q0', read: { match: 'any' }, ops: ['R'], next: 'q0' }], { start: 'q0' }))).toThrow(
      'rule 1 reads any symbol',
    );
  });
});
