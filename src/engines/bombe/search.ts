import { ALPHABET, type Positions, type RotorName, type Three } from '@/engines/enigma';
import type { Menu } from './menu';
import { scramblerTables, START_COUNT, startAt, type ScramblerTables } from './scramblers';

/** A place where the crib fits: the rotor order, the start, and the plug pairs the test worked out. */
export interface Stop {
  rotors: Three<RotorName>;
  start: Positions;
  /** Pairs such as "AV", in alphabetical order. Letters the menu never reached are not in any pair. */
  plugs: readonly string[];
}

/** All 26 wires of one letter lit. */
const ALL_LIT = (1 << 26) - 1;

/** The wire the test lights first in the center letter: the guess "the center letter is plugged to A". */
const FIRST_GUESS = 0;

const bitCount = (bits: number) => {
  let count = 0;
  for (let rest = bits; rest !== 0; rest &= rest - 1) count++;
  return count;
};

/**
 * One rotor order and one menu, ready to test starts. `wires` holds, for each letter, the 26 wires
 * the test lit: bit y of `wires[x]` says "x is plugged to y". The other arrays are kept between
 * tests, so a test makes no new objects.
 */
export interface Tester {
  tables: ScramblerTables;
  center: number;
  /** For each letter, the links it is in: the letter at the other end and the link's number. */
  ends: readonly (readonly { other: number; link: number }[])[];
  /** For each link, how many key presses after the start it sits. */
  presses: Uint16Array;
  /** For each link, where its 26 letters start in `tables.wiring` for the start under test. */
  bases: Int32Array;
  wires: Int32Array;
  queue: Uint16Array;
}

export function createTester(tables: ScramblerTables, menu: Menu): Tester {
  if (menu.center === null) throw new Error('The menu has no links.');
  const ends: { other: number; link: number }[][] = ALPHABET.map(() => []);
  menu.links.forEach(({ plain, cipher }, link) => {
    const [a, b] = [plain.charCodeAt(0) - 65, cipher.charCodeAt(0) - 65];
    ends[a].push({ other: b, link });
    ends[b].push({ other: a, link });
  });
  return {
    tables,
    center: menu.center.charCodeAt(0) - 65,
    ends,
    presses: Uint16Array.from(menu.links, ({ position }) => position + 1),
    bases: new Int32Array(menu.links.length),
    wires: new Int32Array(26),
    queue: new Uint16Array(26 * 26),
  };
}

/** Sets each link's Enigma to where it stands for this start: the start, turned on by the key presses before the link. */
function setLinks(tester: Tester, start: number): void {
  const { presses, bases, tables } = tester;
  let position = start;
  let done = 0;
  // The links are in message order, so `presses` never goes down. It can jump by more than 1,
  // because the menu skips crib letters outside A to Z. One walk forward sets every link.
  for (let link = 0; link < presses.length; link++) {
    while (done < presses[link]) {
      position = tables.next[position];
      done++;
    }
    bases[link] = position * 26;
  }
}

/**
 * Lights the wire "`center` is plugged to `guess`" and spreads it along every link. The diagonal
 * board lights the mirror wire each time: x to y also lights y to x. `until` stops early: "full"
 * when all 26 wires of the center letter light, "clash" when any letter gets a second lit wire.
 * Returns the number of lit center wires, or -1 after a clash.
 */
function spread(tester: Tester, guess: number, until: 'full' | 'clash'): number {
  const { wires, queue, ends, bases, center } = tester;
  const wiring = tester.tables.wiring;
  wires.fill(0);
  let head = 0;
  let tail = 0;

  const light = (x: number, y: number): boolean => {
    if ((wires[x] >> y) & 1) return true;
    wires[x] |= 1 << y;
    wires[y] |= 1 << x;
    queue[tail++] = x * 26 + y;
    if (until === 'clash') return (wires[x] & (wires[x] - 1)) === 0 && (wires[y] & (wires[y] - 1)) === 0;
    return wires[center] !== ALL_LIT;
  };

  if (!light(center, guess)) return until === 'clash' ? -1 : 26;
  while (head < tail) {
    const fact = queue[head++];
    const x = Math.floor(fact / 26);
    const y = fact % 26;
    // x is plugged to y, so each link of x lights "the letter at its other end is plugged to the letter y turns into".
    for (const { other, link } of ends[x]) {
      if (!light(other, wiring[bases[link] + y])) return until === 'clash' ? -1 : 26;
    }
    // The diagonal board: y is plugged to x too, so the links of y do the same with x.
    if (x === y) continue;
    for (const { other, link } of ends[y]) {
      if (!light(other, wiring[bases[link] + x])) return until === 'clash' ? -1 : 26;
    }
  }
  return bitCount(wires[center]);
}

/** The plug pairs in a test without clashes: each letter with one lit wire to another letter. */
function plugPairs(wires: Int32Array): string[] {
  const pairs: string[] = [];
  for (let x = 0; x < 26; x++) {
    for (let y = x + 1; y < 26; y++) {
      if (wires[x] === 1 << y) pairs.push(ALPHABET[x] + ALPHABET[y]);
    }
  }
  return pairs;
}

/**
 * One test: one rotor order, one start. The center letter's 26 wires do not all light at a stop.
 * Then the right partner is a dark wire, or the one lit wire when only one lit. The test tries each
 * of them, and keeps every guess whose plug pairs never give a letter two partners.
 */
export function testStart(tester: Tester, start: number): Stop[] {
  setLinks(tester, start);
  const lit = spread(tester, FIRST_GUESS, 'full');
  if (lit === 26) return [];

  const centerWires = tester.wires[tester.center];
  const guesses = ALPHABET.map((_, letter) => letter).filter((letter) => lit === 1 || ((centerWires >> letter) & 1) === 0);
  const stops: Stop[] = [];
  for (const guess of guesses) {
    if (spread(tester, guess, 'clash') === -1) continue;
    stops.push({ rotors: tester.tables.rotors, start: startAt(start), plugs: plugPairs(tester.wires) });
  }
  return stops;
}

/** Tests all 17,576 starts of one rotor order, from A A A to Z Z Z. */
export function searchOrder(rotors: Three<RotorName>, menu: Menu): Stop[] {
  const tester = createTester(scramblerTables(rotors), menu);
  const stops: Stop[] = [];
  for (let start = 0; start < START_COUNT; start++) stops.push(...testStart(tester, start));
  return stops;
}
