import { describe, expect, it } from 'vitest';
import { press, type EnigmaState } from '@/engines/enigma';
import { blocker, bombeReducer, crashesHere, cribLetters, drumLetters, hints, initialLab, menuOf, NO_SEARCH, placeCount, secretLetters, type BombeAction, type BombeLab } from './lab-state';
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

  it('gives a hint for a crib under 10 letters, and for a menu without a loop', () => {
    expect(hints(run({ type: 'practice' }))).toEqual({ short: false, noLoop: false });
    expect(hints(run({ type: 'practice' }, { type: 'crib', text: 'WETTER' }))).toEqual({ short: true, noLoop: true });
    expect(hints(run({ type: 'crib', text: 'WET' }))).toEqual({ short: false, noLoop: false });
  });

  it('gives the menu of the crib at its place', () => {
    expect(menuOf(run({ type: 'practice' })).loops).toBe(3);
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

  it('keeps the fields while a search runs, and clears the stops after a change', () => {
    expect(bombeReducer(started, { type: 'crib', text: 'WETTER' })).toBe(started);
    expect(bombeReducer(started, { type: 'slide', by: 1 })).toBe(started);
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
