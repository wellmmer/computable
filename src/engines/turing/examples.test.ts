import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import binaryPlusOne from '../../../examples/binary-plus-one.json';
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
