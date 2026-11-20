import type { EnigmaSettings, Positions } from '@/engines/enigma';

/** What an operator needs to decrypt one message: the settings, the start and the secret letters. */
export interface KeySheet {
  settings: EnigmaSettings;
  /** The rotor windows before the first secret letter. */
  start: Positions;
  /** The secret letters, in groups, as the key sheet prints them. */
  cipher: string;
  /** The letters the lamps light when the secret letters are typed from the start. */
  answer: string;
}

/** "RFUGZ edpud" → "RFUGZEDPUD": the letters only, in capitals. */
export function lettersOf(text: string): string {
  return text.toUpperCase().replace(/[^A-Z]/g, '');
}

/** What "Check my answer" says. `at` counts letters from 1. */
export type AnswerCheck =
  | { result: 'empty' }
  | { result: 'right' }
  | { result: 'so-far'; right: number; total: number }
  | { result: 'wrong'; at: number };

/** Compares the lit letters with the answer, letter by letter. A letter too many is wrong too. */
export function checkAnswer(lit: string, answer: string): AnswerCheck {
  if (lit === '') return { result: 'empty' };
  const wrong = [...lit].findIndex((letter, i) => letter !== answer[i]);
  if (wrong !== -1) return { result: 'wrong', at: wrong + 1 };
  if (lit.length === answer.length) return { result: 'right' };
  return { result: 'so-far', right: lit.length, total: answer.length };
}
