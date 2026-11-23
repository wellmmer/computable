import { ALPHABET, indexOf, press, stepRotors, type EnigmaSettings, type Letter, type Positions, type RotorName, type Three } from '@/engines/enigma';
import type { Menu } from './menu';
import { scramblerTables, startIndex, type ScramblerTables } from './scramblers';
import { createTester, testStart } from './search';

/** What one step of a test did. Each kind has one sentence on the page. */
export type TestStepKind =
  /** The test current enters the center letter on one wire: the guess "center is plugged to wire". */
  | { kind: 'enter'; letter: Letter; wire: Letter }
  /** The current goes through one link: `from` on `fromWire` lights `to` on `toWire`. */
  | { kind: 'link'; link: number; from: Letter; fromWire: Letter; to: Letter; toWire: Letter }
  /** The diagonal board lights the mirror wire of the step before: `letter` on `wire`. */
  | { kind: 'mirror'; letter: Letter; wire: Letter }
  /**
   * The end. `all-lit`: the center letter's 26 wires all lit, so no stop. With fewer lit, the test
   * tries each guess for the center letter's partner. `clash`: every guess gave a letter two
   * partners, so no stop. `stop`: at least one guess did not.
   */
  | { kind: 'end'; result: 'all-lit' | 'clash' | 'stop' };

/** One step, with the wires lit after it. Bit y of `wires[x]` says "x is plugged to y". */
export type TestStep = TestStepKind & {
  wires: readonly number[];
  /** How many wires of the center letter are lit after this step. */
  lit: number;
};

/** All 26 wires of one letter lit. */
const ALL_LIT = (1 << 26) - 1;

/** The test's first guess, as in the fast search: the center letter is plugged to A. */
const FIRST_GUESS: Letter = 'A';

const bitCount = (bits: number) => {
  let count = 0;
  for (let rest = bits; rest !== 0; rest &= rest - 1) count++;
  return count;
};

/** The tables of the last rotor order. Building them takes about 15 ms, and slow step mode often opens the same rotor order again. */
let lastTables: ScramblerTables | null = null;

function tablesFor(rotors: Three<RotorName>): ScramblerTables {
  if (lastTables === null || lastTables.rotors.join(' ') !== rotors.join(' ')) lastTables = scramblerTables(rotors);
  return lastTables;
}

/** For each link, the letter that comes out for each of the 26 letters: the Enigma without plugboard at that link's place. */
function linkScramblers(rotors: Three<RotorName>, start: Positions, menu: Menu): Letter[][] {
  const settings: EnigmaSettings = { rotors, rings: ['A', 'A', 'A'], reflector: 'B', plugs: [] };
  let positions = start;
  let presses = 0;
  return menu.links.map(({ position }) => {
    // `press` turns the rotors once before the letter, so the windows stand one press before the link.
    while (presses < position) {
      positions = stepRotors(rotors, positions);
      presses++;
    }
    const state = { settings, positions };
    return ALPHABET.map((letter) => press(state, letter).lamp);
  });
}

/**
 * The steps of one test, for slow step mode (spec R4 4): one rotor order, one start. It follows the
 * fast search's first spread in `search.ts`, in the same order, and records each wire it lights.
 * Links that light no new wire make no step. The spread ends when the center letter's 26 wires all
 * light (no stop), or when no new wire lights. Then the fast search's own `testStart` says if any
 * guess for the center letter's partner fits (a stop), so the two cannot give different answers.
 */
export function testSteps(rotors: Three<RotorName>, start: Positions, menu: Menu): TestStep[] {
  if (menu.center === null) throw new Error('The menu has no links.');
  const center = indexOf(menu.center);
  const scramblers = linkScramblers(rotors, start, menu);
  const ends: { other: number; link: number }[][] = ALPHABET.map(() => []);
  menu.links.forEach(({ plain, cipher }, link) => {
    const [a, b] = [indexOf(plain), indexOf(cipher)];
    ends[a].push({ other: b, link });
    ends[b].push({ other: a, link });
  });

  const wires = new Array<number>(26).fill(0);
  const queue: [number, number][] = [];
  const steps: TestStep[] = [];
  const record = (step: TestStepKind) => steps.push({ ...step, wires: [...wires], lit: bitCount(wires[center]) });

  /** Lights "x is plugged to y" and its mirror. Returns false when the center letter is full. */
  const light = (x: number, y: number, step: TestStepKind): boolean => {
    if ((wires[x] >> y) & 1) return true;
    wires[x] |= 1 << y;
    record(step);
    if (x !== y) {
      wires[y] |= 1 << x;
      record({ kind: 'mirror', letter: ALPHABET[y], wire: ALPHABET[x] });
    }
    queue.push([x, y]);
    return wires[center] !== ALL_LIT;
  };

  const through = (x: number, y: number): boolean => {
    for (const { other, link } of ends[x]) {
      const z = indexOf(scramblers[link][y]);
      const step: TestStepKind = { kind: 'link', link, from: ALPHABET[x], fromWire: ALPHABET[y], to: ALPHABET[other], toWire: ALPHABET[z] };
      if (!light(other, z, step)) return false;
    }
    return true;
  };

  let full = !light(center, indexOf(FIRST_GUESS), { kind: 'enter', letter: menu.center, wire: FIRST_GUESS });
  for (let head = 0; !full && head < queue.length; head++) {
    const [x, y] = queue[head];
    // x is plugged to y: each link of x lights its other end. The diagonal board says y is plugged to x too.
    full = !through(x, y) || (x !== y && !through(y, x));
  }
  if (full) {
    record({ kind: 'end', result: 'all-lit' });
    return steps;
  }
  const stops = testStart(createTester(tablesFor(rotors), menu), startIndex(start));
  record({ kind: 'end', result: stops.length > 0 ? 'stop' : 'clash' });
  return steps;
}
