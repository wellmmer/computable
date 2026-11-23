import { describe, expect, it } from 'vitest';
import { press, type EnigmaState } from '@/engines/enigma';
import { ROTOR_ORDERS, testSteps } from '@/engines/bombe';
import { BARBAROSSA } from './barbarossa';
import { blocker, bombeReducer, crashesHere, cribLetters, drumLetters, hints, initialLab, isBarbarossaAtItsPlace, menuOf, NO_SEARCH, placeCount, secretLetters, slowTestKey, type BombeAction, type BombeLab } from './lab-state';
import { PRACTICE } from './practice-message';
import type { SearchReport } from './search-messages';

/** Runs the actions one after the other from the lab's first state. */
function run(...actions: BombeAction[]): BombeLab {
  return actions.reduce(bombeReducer, initialLab());
}

const STOP = { rotors: ['II', 'III', 'V'], start: ['Q', 'K', 'A'], plugs: ['AH'] } as const;

describe('the Bombe lab at the start (spec R4 3)', () => {
  it('has no secret letters, the crib WETTERBERICHT, and no search', () => {
    const lab = initialLab();
    expect([lab.secretText, lab.cribText, lab.offset]).toEqual(['', 'WETTERBERICHT', 0]);
    expect(lab.search).toEqual(NO_SEARCH);
    expect(lab.slow).toBeNull();
    expect(blocker(lab)).toBe('no-secret');
  });
});

describe('the crib card (spec R4 3, "Crib card")', () => {
  it('loads the practice message: its secret letters in groups of 5, its crib at place 0', () => {
    const lab = run({ type: 'practice' });
    expect(lab.secretText.slice(0, 11)).toBe('HXHIC IRWHZ');
    expect(secretLetters(lab)).toBe(PRACTICE.cipher);
    expect(cribLetters(lab)).toBe('WETTERBERICHT');
    expect(placeCount(lab)).toBe(PRACTICE.cipher.length - 12);
    expect(blocker(lab)).toBeNull();
  });

  it('keeps only the letters of the fields, in capitals', () => {
    const lab = run({ type: 'secret', text: 'abc de-f' }, { type: 'crib', text: 'b c!' });
    expect([secretLetters(lab), cribLetters(lab)]).toEqual(['ABCDEF', 'BC']);
  });

  it('slides the crib between the first and the last place', () => {
    const lab = run({ type: 'secret', text: 'ABCDEF' }, { type: 'crib', text: 'XYZ' });
    expect(run({ type: 'secret', text: 'ABCDEF' }, { type: 'crib', text: 'XYZ' }, { type: 'slide', by: -1 }).offset).toBe(0);
    const right = [1, 2, 3, 4, 5].reduce((next) => bombeReducer(next, { type: 'slide', by: 1 }), lab);
    expect(right.offset).toBe(3);
  });

  it('moves the crib back when the secret letters get shorter', () => {
    const lab = run({ type: 'secret', text: 'ABCDEF' }, { type: 'crib', text: 'XY' }, { type: 'slide', by: 1 }, { type: 'slide', by: 1 }, { type: 'slide', by: 1 });
    expect(bombeReducer(lab, { type: 'secret', text: 'ABC' }).offset).toBe(1);
  });

  it('finds the crashes at the place, and blocks Start there', () => {
    // At place 1, the crib's second E sits on the secret E: Enigma never lights the letter typed.
    const lab = run({ type: 'secret', text: 'QWERTY' }, { type: 'crib', text: 'EE' });
    expect(crashesHere(lab)).toEqual([]);
    const moved = bombeReducer(lab, { type: 'slide', by: 1 });
    expect(crashesHere(moved)).toEqual([2]);
    expect(blocker(moved)).toBe('crash');
  });

  it('says why Start is off', () => {
    expect(blocker(run({ type: 'secret', text: 'ABC' }, { type: 'crib', text: '' }))).toBe('no-crib');
    expect(blocker(run({ type: 'secret', text: 'ABC' }, { type: 'crib', text: 'WXYZ' }))).toBe('crib-too-long');
  });

  it('gives a hint for a crib under 15 letters, and for a menu without a loop', () => {
    // WETTERBERICHT has 13 letters. Start still works with it (spec R4 3).
    expect(hints(run({ type: 'practice' }))).toEqual({ short: true, noLoop: false });
    expect(blocker(run({ type: 'practice' }))).toBeNull();
    expect(hints(run({ type: 'practice' }, { type: 'crib', text: 'WETTERBERICHTXN' }))).toEqual({ short: false, noLoop: false });
    expect(hints(run({ type: 'practice' }, { type: 'crib', text: 'WETTER' }))).toEqual({ short: true, noLoop: true });
    expect(hints(run({ type: 'crib', text: 'WET' }))).toEqual({ short: false, noLoop: false });
  });

  it('loads Home’s secret letters in groups of 5, with an empty crib at place 0 (spec R4 4)', () => {
    const lab = run({ type: 'practice' }, { type: 'slide', by: 1 }, { type: 'load-secret', cipher: 'ABCDEFGH' });
    expect([lab.secretText, lab.cribText, lab.offset]).toEqual(['ABCDE FGH', '', 0]);
    expect(lab.search).toEqual(NO_SEARCH);
    expect(blocker(lab)).toBe('no-crib');
  });

  it('loads Barbarossa part 1: its secret letters in groups of 5, its crib at letter 37 (spec R4 5)', () => {
    const lab = run({ type: 'practice' }, { type: 'slide', by: 1 }, { type: 'barbarossa' });
    expect(lab.secretText.slice(0, 11)).toBe('EDPUD NRGYS');
    expect(secretLetters(lab)).toBe(BARBAROSSA.cipher);
    expect([cribLetters(lab), lab.offset]).toEqual(['OWAXNORDWESTLXSE', 36]);
    expect(lab.search).toEqual(NO_SEARCH);
    expect(blocker(lab)).toBeNull();
    expect(hints(lab)).toEqual({ short: false, noLoop: false });
  });

  it('knows when Barbarossa part 1 sits with its crib at its place', () => {
    expect(isBarbarossaAtItsPlace(run({ type: 'barbarossa' }))).toBe(true);
    expect(isBarbarossaAtItsPlace(run({ type: 'barbarossa' }, { type: 'slide', by: 1 }))).toBe(false);
    expect(isBarbarossaAtItsPlace(run({ type: 'barbarossa' }, { type: 'crib', text: 'NORDWEST' }))).toBe(false);
    expect(isBarbarossaAtItsPlace(run({ type: 'practice' }))).toBe(false);
  });

  it('gives the menu of the crib at its place, and no links while the crib has no place', () => {
    expect(menuOf(run({ type: 'practice' })).loops).toBe(3);
    expect(menuOf(run({ type: 'secret', text: 'ABC' })).links).toEqual([]);
  });
});

describe('the search (spec R4 3, "Drum wall" and "Stops card")', () => {
  const started = run({ type: 'practice' }, { type: 'start', total: 60 });

  it('starts with no stops and 0 of 60 orders done', () => {
    expect(started.search).toEqual({ ...NO_SEARCH, status: 'running', total: 60 });
  });

  it('follows the reports: the start under test, the stops of each order, the end', () => {
    const reports: SearchReport[] = [
      { type: 'testing', order: 0, start: 2197 },
      { type: 'order-done', order: 0, stops: [STOP], count: 1 },
      { type: 'order-done', order: 1, stops: [], count: 0 },
      { type: 'finished' },
    ];
    const lab = reports.reduce((next, report) => bombeReducer(next, { type: 'report', report }), started);
    expect(lab.search).toEqual({ status: 'finished', total: 60, done: 2, testing: { order: 0, start: 2197 }, stops: [STOP], count: 1 });
  });

  it('stops when asked, and ignores reports after that', () => {
    const stopped = bombeReducer(started, { type: 'stop' });
    expect(stopped.search.status).toBe('stopped');
    expect(bombeReducer(stopped, { type: 'report', report: { type: 'finished' } })).toBe(stopped);
  });

  it('ends the search when the worker fails, and keeps what it found', () => {
    const half = bombeReducer(started, { type: 'report', report: { type: 'order-done', order: 0, stops: [STOP], count: 1 } });
    const failed = bombeReducer(half, { type: 'report', report: { type: 'failed' } });
    expect(failed.search).toEqual({ ...half.search, status: 'failed' });
    expect(blocker(failed)).toBeNull();
  });

  it('keeps the fields while a search runs, and clears the stops after a change', () => {
    expect(bombeReducer(started, { type: 'crib', text: 'WETTER' })).toBe(started);
    expect(bombeReducer(started, { type: 'slide', by: 1 })).toBe(started);
    expect(bombeReducer(started, { type: 'load-secret', cipher: 'ABC' })).toBe(started);
    expect(bombeReducer(started, { type: 'barbarossa' })).toBe(started);
    const finished = bombeReducer(started, { type: 'report', report: { type: 'finished' } });
    expect(bombeReducer(finished, { type: 'slide', by: 1 }).search).toEqual(NO_SEARCH);
  });
});

describe('drumLetters (spec R4 3, "Drum wall")', () => {
  it('gives each link\'s Enigma the windows its letter meets: the start, turned once for each key press up to it', () => {
    const menu = menuOf(run({ type: 'practice' }));
    const windows = drumLetters(menu, PRACTICE.settings.rotors, PRACTICE.start);
    expect(windows).toHaveLength(12);
    menu.links.slice(0, 12).forEach(({ position }, link) => {
      let state: EnigmaState = { settings: PRACTICE.settings, positions: PRACTICE.start };
      for (let presses = 0; presses <= position; presses++) state = press(state, 'A').state;
      expect(windows[link], `link ${link}`).toEqual(state.positions);
    });
    expect(windows[0]).toEqual(['Q', 'K', 'B']);
  });
});

describe('slow step mode (spec R4 4, "Watch one test slowly")', () => {
  const open: BombeAction = { type: 'slow-open', rotors: PRACTICE.settings.rotors, start: PRACTICE.start };

  it('opens one test at its first step, with the steps of the engine', () => {
    const lab = run({ type: 'practice' }, open);
    expect(lab.slow).toEqual({ rotors: ['II', 'III', 'V'], start: ['Q', 'K', 'A'], steps: testSteps(PRACTICE.settings.rotors, PRACTICE.start, menuOf(lab)), at: 0 });
  });

  it('steps forward and back, and stays between the first and the last step', () => {
    const lab = run({ type: 'practice' }, open, { type: 'slow-step', by: -1 });
    expect(lab.slow?.at).toBe(0);
    const forward = Array.from({ length: 30 }).reduce<BombeLab>((next) => bombeReducer(next, { type: 'slow-step', by: 1 }), lab);
    expect(forward.slow?.at).toBe(17);
    expect(bombeReducer(forward, { type: 'slow-step', by: -1 }).slow?.at).toBe(16);
  });

  it('closes on Close, when a field changes, and when a search starts', () => {
    const lab = run({ type: 'practice' }, open);
    for (const action of [
      { type: 'slow-close' },
      { type: 'crib', text: 'WETTER' },
      { type: 'slide', by: 1 },
      { type: 'secret', text: 'ABC' },
      { type: 'practice' },
      { type: 'load-secret', cipher: 'ABC' },
      { type: 'start', total: 60 },
    ] satisfies BombeAction[]) {
      expect(bombeReducer(lab, action).slow, action.type).toBeNull();
    }
  });

  it('does not open while a search runs, or while Start is blocked', () => {
    expect(run({ type: 'practice' }, { type: 'start', total: 60 }, open).slow).toBeNull();
    expect(run(open).slow).toBeNull();
    expect(run({ type: 'practice' }, { type: 'slide', by: 1 }, open).slow).toBeNull();
  });

  it('skips to the last step', () => {
    expect(run({ type: 'practice' }, open, { type: 'slow-end' }).slow?.at).toBe(17);
    expect(run({ type: 'practice' }, { type: 'slow-end' }).slow).toBeNull();
  });

  it('picks the test: the first stop of the last search, or else the rotor order and start on the drum wall, or else the first order at A A A', () => {
    const search = { ...NO_SEARCH, status: 'finished', total: 60, done: 60, testing: { order: 3, start: 2197 } } as const;
    const practice = run({ type: 'practice' });
    expect(slowTestKey({ ...practice, search: { ...search, stops: [STOP] } }, ROTOR_ORDERS)).toEqual({ rotors: STOP.rotors, start: STOP.start });
    expect(slowTestKey({ ...practice, search }, ROTOR_ORDERS)).toEqual({ rotors: ROTOR_ORDERS[3], start: ['D', 'G', 'N'] });
    expect(slowTestKey(run({ type: 'secret', text: PRACTICE.cipher.slice(1) }), [['II', 'IV', 'V']])).toEqual({ rotors: ['II', 'IV', 'V'], start: ['A', 'A', 'A'] });
  });

  it('picks the practice key before any search of the practice message with its crib at its place', () => {
    const practice = run({ type: 'practice' });
    expect(slowTestKey(practice, ROTOR_ORDERS)).toEqual({ rotors: ['II', 'III', 'V'], start: ['Q', 'K', 'A'] });
    // The crib moved, or changed: the practice key no longer fits.
    expect(slowTestKey(bombeReducer(practice, { type: 'slide', by: 1 }), ROTOR_ORDERS)).toEqual({ rotors: ROTOR_ORDERS[0], start: ['A', 'A', 'A'] });
    expect(slowTestKey(bombeReducer(practice, { type: 'crib', text: 'WETTERBERICH' }), ROTOR_ORDERS)).toEqual({ rotors: ROTOR_ORDERS[0], start: ['A', 'A', 'A'] });
    // A search that was stopped before any stop: the drum wall's rotor order and start.
    const stopped = { ...NO_SEARCH, status: 'stopped', total: 60, done: 0, testing: { order: 0, start: 2197 } } as const;
    expect(slowTestKey({ ...practice, search: stopped }, ROTOR_ORDERS)).toEqual({ rotors: ROTOR_ORDERS[0], start: ['D', 'G', 'N'] });
  });
});
