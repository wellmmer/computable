import { indexOf, letterAt, press, type EnigmaSettings, type Letter, type PathPoint, type Positions } from '@/engines/enigma';

/** The lab's settings when the page opens (spec R3 3). A reload comes back to them. */
export const LAB_SETTINGS: EnigmaSettings = {
  rotors: ['I', 'II', 'III'],
  rings: ['A', 'A', 'A'],
  reflector: 'B',
  plugs: ['AV', 'BS', 'CG', 'DL', 'FU', 'HZ', 'IN', 'KM', 'OW', 'RX'],
};

export const LAB_START: Positions = ['B', 'L', 'A'];

export interface TypedLetter {
  key: Letter;
  lamp: Letter;
  path: readonly PathPoint[];
  /** The windows before this key turned the rotors. Backspace puts them back. */
  before: Positions;
}

export interface LabState {
  settings: EnigmaSettings;
  /** The letters in the rotor windows now. */
  positions: Positions;
  /** The windows before the first letter in the strips. "Back to start" turns the rotors back here. */
  start: Positions;
  /** The letters in the "You typed" and "Lamps lit" strips. */
  typed: readonly TypedLetter[];
  /** The lit letters from before the last "Back to start", so the visitor can type them to decrypt. */
  previousLit: string;
  /** What the live region says: the lamp that lit, or the letter Backspace removed. `id` makes it speak again. */
  news: { id: number; kind: 'lit' | 'removed'; letter: Letter } | null;
}

export type LabAction =
  | { type: 'press'; key: Letter }
  | { type: 'backspace' }
  | { type: 'turn'; slot: 0 | 1 | 2; by: 1 | -1 }
  | { type: 'back-to-start' }
  | { type: 'clear' }
  | { type: 'settings'; settings: EnigmaSettings };

export function initialLab(): LabState {
  return { settings: LAB_SETTINGS, positions: LAB_START, start: LAB_START, typed: [], previousLit: '', news: null };
}

export function labReducer(lab: LabState, action: LabAction): LabState {
  switch (action.type) {
    case 'press': {
      const { state, lamp, path } = press({ settings: lab.settings, positions: lab.positions }, action.key);
      const typed = [...lab.typed, { key: action.key, lamp, path, before: lab.positions }];
      return { ...lab, positions: state.positions, typed, news: { id: (lab.news?.id ?? 0) + 1, kind: 'lit', letter: lamp } };
    }
    case 'backspace': {
      const last = lab.typed.at(-1);
      if (last === undefined) return lab;
      const news = { id: (lab.news?.id ?? 0) + 1, kind: 'removed', letter: last.key } as const;
      return { ...lab, positions: last.before, typed: lab.typed.slice(0, -1), news };
    }
    case 'turn': {
      const turn = (slot: 0 | 1 | 2) => (slot === action.slot ? letterAt(indexOf(lab.positions[slot]) + action.by) : lab.positions[slot]);
      const positions: Positions = [turn(0), turn(1), turn(2)];
      // With letters in the strips, the start stays where the first letter was typed.
      return { ...lab, positions, start: lab.typed.length === 0 ? positions : lab.start };
    }
    case 'back-to-start':
      return { ...lab, positions: lab.start, typed: [], previousLit: lab.typed.length === 0 ? lab.previousLit : litLetters(lab) };
    case 'clear':
      return { ...lab, start: lab.positions, typed: [], previousLit: '' };
    case 'settings':
      return { ...lab, settings: action.settings, start: lab.positions, typed: [], previousLit: '' };
  }
}

export function typedLetters(lab: LabState): string {
  return lab.typed.map(({ key }) => key).join('');
}

export function litLetters(lab: LabState): string {
  return lab.typed.map(({ lamp }) => lamp).join('');
}

/** "WETTERBERICHT" → "WETTE RBERI CHT": groups of 5, like real Enigma messages. */
export function groupsOf5(letters: string): string {
  return letters.replace(/(.{5})(?=.)/g, '$1 ');
}
