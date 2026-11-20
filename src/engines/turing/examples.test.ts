import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import binaryPlusOne from '../../../examples/binary-plus-one.json';
import oneRotor from '../../../examples/one-rotor.json';
import palindrome from '../../../examples/palindrome.json';
import turingFirst from '../../../examples/turing-1936-first.json';
import { createRun, runUntilHalt, step } from './run';
import { compiled, fromJson } from './test-helpers';

describe('Binary +1', () => {
  const m = compiled(fromJson(binaryPlusOne));

  it('turns 1011 into 1100 and accepts after 8 steps', () => {
    const run = createRun(m);
    expect(runUntilHalt(run)).toBe('halted');
    expect(run).toMatchObject({ status: 'accepted', steps: 8 });
    expect(run.tape.toString()).toBe('1100');
  });

  it('adds 1 to any binary number', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 100_000 }), (n) => {
        const run = createRun(m, n.toString(2));
        runUntilHalt(run);
        expect(run.status).toBe('accepted');
        expect(run.tape.toString()).toBe((n + 1).toString(2));
      }),
    );
  });
});

describe('Palindrome checker', () => {
  const m = compiled(fromJson(palindrome));

  it('accepts exactly the binary palindromes, including the empty input', () => {
    fc.assert(
      fc.property(fc.array(fc.constantFrom('0', '1'), { maxLength: 12 }), (symbols) => {
        const input = symbols.join('');
        const run = createRun(m, input);
        expect(runUntilHalt(run)).toBe('halted');
        expect(run.status).toBe(input === [...symbols].reverse().join('') ? 'accepted' : 'rejected');
      }),
    );
  });

  // Lesson 2 (content/lessons/formal-definition) quotes the numbers below.
  it('accepts its own input 0110 after 15 steps, with a blank tape', () => {
    const run = createRun(m);
    runUntilHalt(run);
    expect(run).toMatchObject({ status: 'accepted', steps: 15, reason: { kind: 'accept-state', state: 'qA' } });
    expect(run.tape.toString()).toBe('');
  });

  it('rejects 0111 in qR after 6 steps', () => {
    const run = createRun(m, '0111');
    runUntilHalt(run);
    expect(run).toMatchObject({ status: 'rejected', steps: 6, reason: { kind: 'reject-state', state: 'qR' } });
  });

  it('has one rule for each of its 6 other states and each of its 3 tape symbols, and S only into qA or qR', () => {
    const machine = fromJson(palindrome);
    const rules = machine.rules.flatMap((rule) => ('move' in rule ? [rule] : []));
    expect(rules).toHaveLength(machine.rules.length);
    const states = ['q0', 'q1', 'q2', 'q3', 'q4', 'q5'];
    const pairs = rules.map((rule) => `${rule.state} ${rule.read}`).sort();
    expect(pairs).toEqual(states.flatMap((state) => ['0', '1', '_'].map((symbol) => `${state} ${symbol}`)).sort());
    expect(rules.filter((rule) => rule.move === 'S').map((rule) => rule.next)).toEqual(['qA', 'qR', 'qA', 'qR', 'qA']);
  });
});

describe("Turing's first machine (1936)", () => {
  const m = compiled(fromJson(turingFirst));

  it('prints 0 1 0 1 on every other square', () => {
    const run = createRun(m);
    for (let i = 0; i < 8; i++) step(run);
    expect(run.tape.toString()).toBe('0_1_0_1');
    expect(run).toMatchObject({ head: 8, state: '𝔟' });
  });

  it('never halts, so it pauses at the step limit', () => {
    const run = createRun(m);
    expect(runUntilHalt(run, 10_000)).toBe('limit');
    expect(run.status).toBe('running');
  });
});

describe('One-rotor cipher', () => {
  const m = compiled(fromJson(oneRotor));
  const LETTERS = 'ABCD';
  // Written here, not imported from the example, so this test can fail.
  const WIRING = 'BDAC';

  /** At position p, letter x becomes WIRING[(x + p) mod 4] − p mod 4. The rotor turns one step after each letter. */
  function rotor(text: string): string {
    return [...text]
      .map((letter, index) => {
        const position = index % 4;
        const wired = LETTERS.indexOf(WIRING[(LETTERS.indexOf(letter) + position) % 4]);
        return LETTERS[(wired - position + 4) % 4];
      })
      .join('');
  }

  const allInputs = [...LETTERS].flatMap((a) =>
    [...LETTERS].flatMap((b) => [...LETTERS].flatMap((c) => [...LETTERS].map((d) => a + b + c + d))),
  );

  it('turns its own input AAAA into BCCD and accepts after 5 steps', () => {
    const run = createRun(m);
    runUntilHalt(run);
    expect(run).toMatchObject({ status: 'accepted', steps: 5 });
    expect(run.tape.toString()).toBe('BCCD');
  });

  it('gives the rotor function for all 256 inputs from AAAA to DDDD', () => {
    expect(allInputs).toHaveLength(256);
    for (const input of allInputs) {
      const run = createRun(m, input);
      expect(runUntilHalt(run)).toBe('halted');
      expect([input, run.status, run.tape.toString()]).toEqual([input, 'accepted', rotor(input)]);
    }
  });

  it('never turns a letter into itself', () => {
    for (const input of allInputs) {
      const run = createRun(m, input);
      runUntilHalt(run);
      const output = run.tape.toString();
      expect([...input].some((letter, index) => output[index] === letter)).toBe(false);
    }
  });

  it('keeps turning after a full turn of the rotor, for inputs of any length', () => {
    fc.assert(
      fc.property(fc.array(fc.constantFrom('A', 'B', 'C', 'D'), { maxLength: 12 }), (letters) => {
        const input = letters.join('');
        const run = createRun(m, input);
        runUntilHalt(run);
        expect(run.status).toBe('accepted');
        expect(run.tape.toString()).toBe(rotor(input));
      }),
    );
  });

  it('has 16 cipher rules, one for each position and letter, and 4 rules that stop on the blank', () => {
    const machine = fromJson(oneRotor);
    const rules = machine.rules.flatMap((rule) => ('move' in rule ? [rule] : []));
    expect(rules).toHaveLength(20);
    const cipher = rules.filter((rule) => rule.read !== '_');
    expect(cipher.map((rule) => `${rule.state} ${rule.read}`).sort()).toEqual(
      ['p0', 'p1', 'p2', 'p3'].flatMap((state) => [...LETTERS].map((letter) => `${state} ${letter}`)),
    );
    expect(rules.filter((rule) => rule.read === '_').map((rule) => rule.next)).toEqual(['qA', 'qA', 'qA', 'qA']);
  });
});
