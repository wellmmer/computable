import { buildMenu, crashes, startAt, testSteps, type Menu, type Stop, type TestStep } from '@/engines/bombe';
import { stepRotors, type Positions, type RotorName, type Three } from '@/engines/enigma';
import { lettersOf } from '@/enigma/key-sheet';
import { groupsOf5 } from '@/enigma/lab-state';
import { BARBAROSSA } from './barbarossa';
import { PRACTICE } from './practice-message';
import type { SearchReport } from './search-messages';

export interface Search {
  /** `failed`: the worker could not load or run. */
  status: 'idle' | 'running' | 'finished' | 'stopped' | 'failed';
  /** How many rotor orders the search tests: 60, or fewer with the test setting. */
  total: number;
  /** How many rotor orders are done. */
  done: number;
  /** The rotor order (its number in the search) and the start under test, for the drum wall. */
  testing: { order: number; start: number } | null;
  /** The listed stops, at most 100. */
  stops: readonly Stop[];
  /** All stops so far, listed or not. */
  count: number;
}

/** Slow step mode (spec R4 4): one test, its steps, and the step on screen. */
export interface SlowTest {
  rotors: Three<RotorName>;
  start: Positions;
  steps: readonly TestStep[];
  /** The step on screen, from 0. */
  at: number;
}

export interface BombeLab {
  /** The secret letters field, as the visitor typed it. */
  secretText: string;
  /** The crib field, as the visitor typed it. */
  cribText: string;
  /** The place of the crib's first letter in the secret letters, from 0. */
  offset: number;
  search: Search;
  /** The test that slow step mode shows, or null when it is closed. */
  slow: SlowTest | null;
}

export type BombeAction =
  | { type: 'secret'; text: string }
  | { type: 'crib'; text: string }
  | { type: 'slide'; by: 1 | -1 }
  | { type: 'practice' }
  /** "Break part 1 with the Bombe": Barbarossa part 1 and its crib (spec R4 5). */
  | { type: 'barbarossa' }
  /** Home's secret letters, from "Break it with the Bombe" (spec R4 4). */
  | { type: 'load-secret'; cipher: string }
  | { type: 'start'; total: number }
  | { type: 'report'; report: SearchReport }
  | { type: 'stop' }
  | { type: 'slow-open'; rotors: Three<RotorName>; start: Positions }
  | { type: 'slow-step'; by: 1 | -1 }
  /** "Skip to the end": the last step. */
  | { type: 'slow-end' }
  | { type: 'slow-close' };

/**
 * The longest secret letters field, in characters. The search keeps each link's key presses in a
 * 16-bit number, which stops at 65,535. Enigma messages were short, so 2,000 leaves plenty of room.
 */
export const SECRET_MAX_LENGTH = 2000;

export const NO_SEARCH: Search = { status: 'idle', total: 0, done: 0, testing: null, stops: [], count: 0 };

/** The lab when the page opens: no secret letters yet, and the crib WETTERBERICHT. */
export function initialLab(): BombeLab {
  return { secretText: '', cribText: PRACTICE.crib, offset: 0, search: NO_SEARCH, slow: null };
}

export const secretLetters = (lab: BombeLab) => lettersOf(lab.secretText);
export const cribLetters = (lab: BombeLab) => lettersOf(lab.cribText);

/** How many places the crib can take under the secret letters. 0 when one of them is empty or the crib is longer. */
export function placeCount(lab: BombeLab): number {
  const [secret, crib] = [secretLetters(lab), cribLetters(lab)];
  return secret === '' || crib === '' ? 0 : Math.max(0, secret.length - crib.length + 1);
}

/** The offset moved into the places the crib can take. */
function clamp(lab: BombeLab): BombeLab {
  return { ...lab, offset: Math.min(lab.offset, Math.max(0, placeCount(lab) - 1)) };
}

export function bombeReducer(lab: BombeLab, action: BombeAction): BombeLab {
  const running = lab.search.status === 'running';
  switch (action.type) {
    case 'secret':
      return running ? lab : clamp({ ...lab, secretText: action.text, search: NO_SEARCH, slow: null });
    case 'crib':
      return running ? lab : clamp({ ...lab, cribText: action.text, search: NO_SEARCH, slow: null });
    case 'slide':
      return running ? lab : clamp({ ...lab, offset: Math.max(0, lab.offset + action.by), search: NO_SEARCH, slow: null });
    case 'practice':
      return running ? lab : { secretText: groupsOf5(PRACTICE.cipher), cribText: PRACTICE.crib, offset: PRACTICE.offset, search: NO_SEARCH, slow: null };
    case 'barbarossa':
      return running ? lab : { secretText: groupsOf5(BARBAROSSA.cipher), cribText: BARBAROSSA.crib, offset: BARBAROSSA.offset, search: NO_SEARCH, slow: null };
    case 'load-secret':
      // The crib is the visitor's to choose: about 15 letters they know are in their message.
      return running ? lab : { secretText: groupsOf5(action.cipher), cribText: '', offset: 0, search: NO_SEARCH, slow: null };
    case 'start':
      return { ...lab, search: { ...NO_SEARCH, status: 'running', total: action.total }, slow: null };
    case 'slow-open': {
      if (running || blocker(lab) !== null) return lab;
      const { rotors, start } = action;
      return { ...lab, slow: { rotors, start, steps: testSteps(rotors, start, menuOf(lab)), at: 0 } };
    }
    case 'slow-step': {
      if (lab.slow === null) return lab;
      const at = Math.min(Math.max(lab.slow.at + action.by, 0), lab.slow.steps.length - 1);
      return { ...lab, slow: { ...lab.slow, at } };
    }
    case 'slow-end':
      return lab.slow === null ? lab : { ...lab, slow: { ...lab.slow, at: lab.slow.steps.length - 1 } };
    case 'slow-close':
      return { ...lab, slow: null };
    case 'stop':
      return running ? { ...lab, search: { ...lab.search, status: 'stopped' } } : lab;
    case 'report': {
      if (!running) return lab;
      const { report } = action;
      const search = lab.search;
      switch (report.type) {
        case 'testing':
          return { ...lab, search: { ...search, testing: { order: report.order, start: report.start } } };
        case 'order-done':
          return { ...lab, search: { ...search, done: report.order + 1, stops: [...search.stops, ...report.stops], count: search.count + report.count } };
        case 'finished':
          return { ...lab, search: { ...search, status: 'finished' } };
        case 'failed':
          return { ...lab, search: { ...search, status: 'failed' } };
      }
    }
  }
}

/** The menu of the crib at its place. It has no links while the crib has no place. */
export function menuOf(lab: BombeLab): Menu {
  if (placeCount(lab) === 0) return buildMenu('', '', 0);
  return buildMenu(secretLetters(lab), cribLetters(lab), lab.offset);
}

/** The places in the message where a crib letter would turn into itself. */
export function crashesHere(lab: BombeLab): number[] {
  return placeCount(lab) === 0 ? [] : crashes(secretLetters(lab), cribLetters(lab), lab.offset);
}

/** Why Start does not work: no secret letters, no crib, a crib too long, or a crash at its place. */
export type Blocker = 'no-secret' | 'no-crib' | 'crib-too-long' | 'crash';

/** Why Start does not work now, or null when it does. */
export function blocker(lab: BombeLab): Blocker | null {
  if (secretLetters(lab) === '') return 'no-secret';
  if (cribLetters(lab) === '') return 'no-crib';
  if (placeCount(lab) === 0) return 'crib-too-long';
  if (crashesHere(lab).length > 0) return 'crash';
  return null;
}

/** The hint asks for a crib of at least this many letters. A shorter crib still runs (spec R4 3). */
export const HINT_CRIB_LETTERS = 15;

/** The hints under the crib: a crib under 15 letters, and a menu without a loop. */
export function hints(lab: BombeLab): { short: boolean; noLoop: boolean } {
  if (placeCount(lab) === 0) return { short: false, noLoop: false };
  return { short: cribLetters(lab).length < HINT_CRIB_LETTERS, noLoop: menuOf(lab).loops === 0 };
}

/** True when the lab holds the practice message, with WETTERBERICHT at its place. */
function isPracticeAtItsPlace(lab: BombeLab): boolean {
  return secretLetters(lab) === PRACTICE.cipher && cribLetters(lab) === PRACTICE.crib && lab.offset === PRACTICE.offset;
}

/** True when the lab holds Barbarossa part 1, with its crib at its place. The crib card then says why the stop's start is not B L A. */
export function isBarbarossaAtItsPlace(lab: BombeLab): boolean {
  return secretLetters(lab) === BARBAROSSA.cipher && cribLetters(lab) === BARBAROSSA.crib && lab.offset === BARBAROSSA.offset;
}

/**
 * The test that "Watch one test slowly" shows. A test without a stop takes 286 to 445 steps, and a
 * stop about 18, so the card opens on a stop when it knows one. First choice: the first stop of the
 * last search. Before any search of the practice message: the practice key. Otherwise: the rotor
 * order and start on the drum wall.
 */
export function slowTestKey(lab: BombeLab, orders: readonly Three<RotorName>[]): { rotors: Three<RotorName>; start: Positions } {
  const { search } = lab;
  const [stop] = search.stops;
  if (stop !== undefined) return { rotors: stop.rotors, start: stop.start };
  if (search.status === 'idle' && isPracticeAtItsPlace(lab)) return { rotors: PRACTICE.settings.rotors, start: PRACTICE.start };
  if (search.testing !== null) return { rotors: orders[search.testing.order], start: startAt(search.testing.start) };
  return { rotors: orders[0], start: ['A', 'A', 'A'] };
}

/** The drum wall shows one Enigma for each link, up to 12. */
export const WALL_ENIGMAS = 12;

/** The windows of each Enigma on the drum wall: the start, turned on by the key presses before its link. */
export function drumLetters(menu: Menu, rotors: Three<RotorName>, start: Positions): Positions[] {
  const letters: Positions[] = [];
  let positions = start;
  let presses = 0;
  for (const { position } of menu.links.slice(0, WALL_ENIGMAS)) {
    while (presses < position + 1) {
      positions = stepRotors(rotors, positions);
      presses++;
    }
    letters.push(positions);
  }
  return letters;
}
