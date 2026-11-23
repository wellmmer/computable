import { describe, expect, it } from 'vitest';
import { PRACTICE } from '@/bombe/practice-message';
import { ALPHABET, encrypt, stepRotors, type Letter, type Positions } from '@/engines/enigma';
import { randomKey } from '@/home/random-key';
import { buildMenu, type Menu } from './menu';
import { ROTOR_ORDERS, scramblerTables, startAt, startIndex, START_COUNT } from './scramblers';
import { createTester, testStart, type Tester } from './search';
import { testSteps } from './test-steps';

const MENU = buildMenu(PRACTICE.cipher, PRACTICE.crib, PRACTICE.offset);

/** Numbers from 0 up to 1 that are the same on each run (mulberry32), so the random keys are too. */
function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The windows after `presses` key presses from `start`. */
function after(rotors: (typeof ROTOR_ORDERS)[number], start: Positions, presses: number): Positions {
  let positions = start;
  for (let i = 0; i < presses; i++) positions = stepRotors(rotors, positions);
  return positions;
}

describe('testSteps: one test, step by step (spec R4 4, slow step mode)', () => {
  it('starts with the test current in the center letter, on wire A, and its mirror', () => {
    const [enter, mirror] = testSteps(['I', 'II', 'III'], ['A', 'A', 'A'], MENU);
    expect(MENU.center).toBe('H');
    expect(enter).toMatchObject({ kind: 'enter', letter: 'H', wire: 'A', lit: 1 });
    expect(mirror).toMatchObject({ kind: 'mirror', letter: 'A', wire: 'H' });
  });

  it('ends with a stop at the practice key, in 18 steps, with fewer than 26 wires of H lit', () => {
    const steps = testSteps(PRACTICE.settings.rotors, PRACTICE.start, MENU);
    expect(steps).toHaveLength(18);
    expect(steps.at(-1)).toMatchObject({ kind: 'end', result: 'stop' });
    expect(steps.at(-1)?.lit).toBeLessThan(26);
  });

  it('ends with all 26 wires of the center letter lit where the first guess fills it, with the same wires as the fast search', () => {
    let compared = 0;
    for (const rotors of [ROTOR_ORDERS[0], ROTOR_ORDERS[37]]) {
      const tester = createTester(scramblerTables(rotors), MENU);
      for (let start = 0; start < START_COUNT; start += 251) {
        testStart(tester, start);
        const end = testSteps(rotors, startAt(start), MENU).at(-1);
        if (end?.kind === 'end' && end.result === 'all-lit') {
          expect(end.lit).toBe(26);
          expect(end.wires).toEqual([...tester.wires]);
          compared++;
        }
      }
    }
    expect(compared).toBeGreaterThan(100);
  });

  it('ends with a stop exactly where the fast search finds one, also with weak menus from 9- to 12-letter cribs', () => {
    const random = seeded(1940);
    const ends = { stop: 0, clash: 0, 'all-lit': 0 };
    const check = (tester: Tester, menu: Menu, start: number) => {
      const rotors = tester.tables.rotors;
      const stops = testStart(tester, start);
      const end = testSteps(rotors, startAt(start), menu).at(-1);
      if (end?.kind !== 'end') throw new Error('The last step is not the end.');
      expect(end.result === 'stop', `${rotors.join(' ')} ${startAt(start).join(' ')}`).toBe(stops.length > 0);
      ends[end.result]++;
    };

    // The reviewer's example: the lab's first secret letters, crib WETTERBERICH. The first guess lights 1 wire of E, but every guess clashes.
    const example = buildMenu('PBJGOLIZQMQG', 'WETTERBERICH', 0);
    check(createTester(scramblerTables(['IV', 'V', 'II']), example), example, startIndex(['A', 'A', 'A']));
    expect(ends.clash).toBe(1);

    for (let run = 0; run < 12; run++) {
      const { settings, start } = randomKey(random);
      const plain = Array.from({ length: 12 }, () => ALPHABET[Math.floor(random() * 26)]).join('');
      const crib = plain.slice(0, 9 + (run % 4));
      const menu = buildMenu(encrypt(settings, start, plain), crib, 0);
      for (const rotors of [settings.rotors, ROTOR_ORDERS[(run * 7) % 60]]) {
        const tester = createTester(scramblerTables(rotors), menu);
        for (let at = run; at < START_COUNT; at += 97) check(tester, menu, at);
      }
    }
    // Each kind of end shows up, so the test compares all three.
    expect(ends.stop).toBeGreaterThan(500);
    expect(ends.clash).toBeGreaterThan(500);
    expect(ends['all-lit']).toBeGreaterThan(500);
    // It builds 24 scrambler tables: 1.5 s alone, but over 5 s when the whole suite shares a busy machine.
  }, 20_000);

  it('lights one new wire in each step but the last; a mirror step lights the mirror of the wire before it', () => {
    const steps = testSteps(['I', 'II', 'III'], ['A', 'A', 'A'], MENU);
    const index = (letter: Letter) => letter.charCodeAt(0) - 65;
    steps.slice(0, -1).forEach((step, i) => {
      const before = i === 0 ? new Array<number>(26).fill(0) : steps[i - 1].wires;
      const changed = step.wires.flatMap((bits, x) => (bits === before[x] ? [] : [{ x, bit: bits ^ before[x] }]));
      expect(changed).toHaveLength(1);
      expect(changed[0].bit & (changed[0].bit - 1)).toBe(0);
      if (step.kind === 'mirror') {
        const previous = steps[i - 1];
        const lit = previous.kind === 'enter' ? { letter: previous.letter, wire: previous.wire } : previous.kind === 'link' ? { letter: previous.to, wire: previous.toWire } : null;
        expect(lit).toEqual({ letter: step.wire, wire: step.letter });
        expect(changed[0]).toEqual({ x: index(step.letter), bit: 1 << index(step.wire) });
      }
    });
  });

  it('sends the current through the Enigma of the link: its wire comes out as the lit wire', () => {
    const rotors = ROTOR_ORDERS[5];
    const start: Positions = ['K', 'Q', 'C'];
    const settings = { rotors, rings: ['A', 'A', 'A'] as const, reflector: 'B' as const, plugs: [] };
    for (const step of testSteps(rotors, start, MENU)) {
      if (step.kind !== 'link') continue;
      const { plain, cipher, position } = MENU.links[step.link];
      expect([plain, cipher].sort()).toEqual([step.from, step.to].sort());
      expect(encrypt(settings, after(rotors, start, position), step.fromWire)).toBe(step.toWire);
    }
  });

  it('needs a menu with links', () => {
    expect(() => testSteps(['I', 'II', 'III'], ['A', 'A', 'A'], buildMenu('', '', 0))).toThrow();
  });
});
