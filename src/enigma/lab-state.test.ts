import { describe, expect, it } from 'vitest';
import { isLetter } from '@/engines/enigma';
import { groupsOf5, initialLab, labReducer, litLetters, typedLetters, type LabAction, type LabState } from './lab-state';

/** Runs the actions one after the other from the lab's first state. */
function run(...actions: LabAction[]): LabState {
  return actions.reduce(labReducer, initialLab());
}

const type = (text: string): LabAction[] => [...text].filter(isLetter).map((key) => ({ type: 'press', key }));

describe('the lab at the start (spec R3 3)', () => {
  it('uses the default settings: rotors I II III, rings A A A, 10 plug pairs, reflector B, start B L A', () => {
    const lab = initialLab();
    expect(lab.settings).toEqual({
      rotors: ['I', 'II', 'III'],
      rings: ['A', 'A', 'A'],
      reflector: 'B',
      plugs: ['AV', 'BS', 'CG', 'DL', 'FU', 'HZ', 'IN', 'KM', 'OW', 'RX'],
    });
    expect(lab.positions).toEqual(['B', 'L', 'A']);
    expect(lab.start).toEqual(['B', 'L', 'A']);
    expect(lab.typed).toEqual([]);
  });
});

describe('labReducer', () => {
  it('types WETTERBERICHT and lights PBJGOLIZQMQGZ, with the windows at B L N', () => {
    const lab = run(...type('WETTERBERICHT'));
    expect(typedLetters(lab)).toBe('WETTERBERICHT');
    expect(litLetters(lab)).toBe('PBJGOLIZQMQGZ');
    expect(lab.positions).toEqual(['B', 'L', 'N']);
    expect(lab.typed.at(-1)?.path.map(({ letter }) => letter).join('')).toBe('TTPPWVMXHZ');
  });

  it('removes the last letter on Backspace and turns the rotors back one step', () => {
    const lab = run(...type('WETTER'), { type: 'backspace' });
    expect(typedLetters(lab)).toBe('WETTE');
    expect(lab.positions).toEqual(['B', 'L', 'F']);
    expect(run({ type: 'backspace' })).toEqual(initialLab());
  });

  it('turns the rotors back through the double step on Backspace: A D U, 3 keys, then 3 Backspaces', () => {
    const typing = type('AAA').reduce(labReducer, { ...initialLab(), positions: ['A', 'D', 'U'], start: ['A', 'D', 'U'] });
    expect(typing.positions).toEqual(['B', 'F', 'X']);
    const windows: string[] = [];
    let lab = typing;
    for (let i = 0; i < 3; i++) {
      lab = labReducer(lab, { type: 'backspace' });
      windows.push(lab.positions.join(''));
    }
    expect(windows).toEqual(['AEW', 'ADV', 'ADU']);
  });

  it('tells the live region which lamp lit, or which letter Backspace removed', () => {
    expect(run(...type('W')).news).toEqual({ id: 1, kind: 'lit', letter: 'P' });
    expect(run(...type('WE'), { type: 'backspace' }).news).toEqual({ id: 3, kind: 'removed', letter: 'E' });
  });

  it('tells the live region which rotor turned, and its new window letter', () => {
    expect(run({ type: 'turn', slot: 1, by: 1 }).news).toEqual({ id: 1, kind: 'turned', slot: 1, letter: 'M' });
    expect(run(...type('W'), { type: 'turn', slot: 2, by: -1 }).news).toEqual({ id: 2, kind: 'turned', slot: 2, letter: 'A' });
  });

  it('goes back to the start, keeps the lit letters to type, and decrypts them', () => {
    const lab = run(...type('WETTERBERICHT'), { type: 'back-to-start' });
    expect(lab.positions).toEqual(['B', 'L', 'A']);
    expect(lab.typed).toEqual([]);
    expect(lab.previousLit).toBe('PBJGOLIZQMQGZ');
    expect(litLetters(run(...type('WETTERBERICHT'), { type: 'back-to-start' }, ...type('PBJGOLIZQMQGZ')))).toBe('WETTERBERICHT');
  });

  it('turns a rotor window up and down, round the alphabet', () => {
    expect(run({ type: 'turn', slot: 2, by: 1 }).positions).toEqual(['B', 'L', 'B']);
    expect(run({ type: 'turn', slot: 2, by: -1 }).positions).toEqual(['B', 'L', 'Z']);
    expect(run({ type: 'turn', slot: 0, by: -1 }, { type: 'turn', slot: 0, by: -1 }).positions).toEqual(['Z', 'L', 'A']);
  });

  it('moves the start with the windows while the strips are empty', () => {
    const lab = run({ type: 'turn', slot: 1, by: 1 });
    expect(lab.start).toEqual(['B', 'M', 'A']);
    expect(lab.previousLit).toBe('');
  });

  it('starts a new message when a rotor turns with letters in the strips', () => {
    const lab = run(...type('WE'), { type: 'turn', slot: 1, by: 1 });
    expect(lab.positions).toEqual(['B', 'M', 'C']);
    expect(lab.start).toEqual(['B', 'M', 'C']);
    expect(lab.typed).toEqual([]);
    expect(lab.previousLit).toBe('PB');
    expect(lab.previousLitAfter).toBe('turn');
  });

  it('decrypts the letters typed after a turn: WE, ▲ on the middle rotor, T, back to start, then the lit letters', () => {
    const typing = run(...type('WE'), { type: 'turn', slot: 1, by: 1 }, ...type('T'));
    const back = labReducer(typing, { type: 'back-to-start' });
    expect(back.positions).toEqual(['B', 'M', 'C']);
    expect(back.previousLitAfter).toBe('back');
    expect(litLetters(type(back.previousLit).reduce(labReducer, back))).toBe('T');
  });

  it('does not undo a turn on Backspace', () => {
    const lab = run(...type('WE'), { type: 'turn', slot: 1, by: 1 }, { type: 'backspace' });
    expect(lab.positions).toEqual(['B', 'M', 'C']);
  });

  it('clears the strips and keeps the windows, which become the new start', () => {
    const lab = run(...type('WETTER'), { type: 'back-to-start' }, ...type('AB'), { type: 'clear' });
    expect(lab.typed).toEqual([]);
    expect(lab.previousLit).toBe('');
    expect(lab.positions).toEqual(['B', 'L', 'C']);
    expect(lab.start).toEqual(['B', 'L', 'C']);
  });

  it('takes new settings, and clears the strips because the old letters no longer match', () => {
    const settings = { rotors: ['V', 'I', 'III'], rings: ['B', 'C', 'D'], reflector: 'C', plugs: [] } as const;
    const lab = run(...type('WE'), { type: 'settings', settings });
    expect(lab.settings).toEqual(settings);
    expect(lab.typed).toEqual([]);
    expect(lab.positions).toEqual(['B', 'L', 'C']);
    expect(lab.start).toEqual(['B', 'L', 'C']);
  });

  it('loads a key sheet: its settings, and its start in the windows, with empty strips', () => {
    const settings = { rotors: ['II', 'IV', 'V'], rings: ['B', 'U', 'L'], reflector: 'B', plugs: ['AV', 'BS'] } as const;
    const lab = run(...type('WE'), { type: 'back-to-start' }, { type: 'load', settings, start: ['L', 'S', 'D'] });
    expect(lab.settings).toEqual(settings);
    expect(lab.positions).toEqual(['L', 'S', 'D']);
    expect(lab.start).toEqual(['L', 'S', 'D']);
    expect(lab.typed).toEqual([]);
    expect(lab.previousLit).toBe('');
  });

  it('types a whole text at once, as if each key were pressed in turn', () => {
    expect(run({ type: 'type', letters: 'WETTERBERICHT' })).toEqual(run(...type('WETTERBERICHT')));
  });
});

describe('groupsOf5', () => {
  it('writes letters in groups of 5, like real messages', () => {
    expect(groupsOf5('WETTERBERICHT')).toBe('WETTE RBERI CHT');
    expect(groupsOf5('ABCDE')).toBe('ABCDE');
    expect(groupsOf5('')).toBe('');
  });
});
