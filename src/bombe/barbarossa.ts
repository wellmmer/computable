import type { Positions } from '@/engines/enigma';
import { lettersOf } from '@/enigma/key-sheet';
import { REAL_MESSAGES, type RealMessagePart } from '@/enigma/real-messages';

const message = REAL_MESSAGES.find(({ id }) => id === 'barbarossa');
if (message === undefined) throw new Error('The real messages have no Barbarossa.');

/** Part 1 of the Barbarossa message (7 July 1941), with its real key: rings B U L, start B L A. */
export const BARBAROSSA_PART_1: RealMessagePart = message.parts[0];

/**
 * Barbarossa part 1 on the Bombe (spec R4 5). The crib comes from the known plain text:
 * "…Kurtinowa nordwestl. Sebez…". Of the cribs tested on 2026-11-23, it gave the fewest stops: 1 in
 * all 60 rotor orders, and that stop is the real rotor order. src/bombe/barbarossa.test.ts checks it.
 */
export const BARBAROSSA = {
  cipher: lettersOf(BARBAROSSA_PART_1.cipher),
  crib: 'OWAXNORDWESTLXSE',
  /** The crib starts at letter 37. */
  offset: 36,
  /**
   * The start the Bombe finds. It assumes rings A A A, so it cannot find the real start B L A. Its
   * middle rotor also turns at other letters, so the stop's key reads the message only in blocks.
   */
  foundStart: ['A', 'Q', 'P'] satisfies Positions,
} as const;
