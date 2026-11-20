import type { EnigmaSettings, Positions } from '@/engines/enigma';

/** The Bombe's practice message: one made-up German weather report, the same in every language (spec R4 3). */
export const PRACTICE = {
  /** The key the Bombe must find: rings A A A and reflector B, as the Bombe assumes. */
  settings: {
    rotors: ['II', 'III', 'V'],
    rings: ['A', 'A', 'A'],
    reflector: 'B',
    plugs: ['AH', 'BP', 'DF', 'EX', 'KW', 'MR', 'NT', 'OY', 'SU', 'VZ'],
  } satisfies EnigmaSettings,
  start: ['Q', 'K', 'A'] satisfies Positions,
  /** "Weather report North Sea, wind south-west force 4, visibility 10 km, rain in the evening." X is a space. */
  plain: 'WETTERBERICHTXNORDSEEXWINDXSUEDWESTXSTAERKEXVIERXSICHTXZEHNXKILOMETERXREGENXAMXABEND',
  /** The secret letters. src/bombe/practice-message.test.ts checks them with the Enigma engine. */
  cipher: 'HXHICIRWHZRQWGLYJJPQQOZESUNJBMNMGNHCKUIRWZUMGVHOMUCJLAMYBKQMBVTKDZEJQSBANARKZVNFYUUQ',
  crib: 'WETTERBERICHT',
  /** The crib starts the message. */
  offset: 0,
} as const;
