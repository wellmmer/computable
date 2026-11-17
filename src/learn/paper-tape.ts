import type { SimulatorStore } from '@/simulator/store';

/**
 * Where a part counts as reached: once its top has passed this share of the window's height. The
 * line sits below the sticky tape, which takes about 27% of a 390 × 844 phone screen.
 */
export const READING_LINE = 0.5;

/**
 * The reading line in pixels from the top of the window. It is in the middle of the window, or at
 * the bottom edge of the sticky tape if that edge is lower, so no part counts as reached while it
 * is under the tape. `stickyTapeHeight` is null when the tape does not stick (a short window).
 */
export function readingLine({ windowHeight, stickyTapeHeight }: { windowHeight: number; stickyTapeHeight: number | null }): number {
  return Math.max(windowHeight * READING_LINE, stickyTapeHeight ?? 0);
}

/**
 * How many parts the visitor has reached: the parts whose top is at or above the reading line. The
 * tape runs this many steps. Scrolling back up lowers the count, so the machine steps back too.
 */
export function partsReached(tops: readonly number[], line: number): number {
  return tops.filter((top) => top <= line).length;
}

/**
 * How the tape moves (spec R2c 3). "scroll": each part reached is one step. "buttons": Step and
 * Reset, for a visitor who asks for reduced motion or a browser without IntersectionObserver.
 * "static" is the server's HTML, before the script runs: the tape at its start.
 */
export type TapeMode = 'static' | 'scroll' | 'buttons';

export function tapeMode({ reducedMotion, observer }: { reducedMotion: boolean; observer: boolean }): Exclude<TapeMode, 'static'> {
  return reducedMotion || !observer ? 'buttons' : 'scroll';
}

/** Steps the machine forward or back until it has made `step` steps, or until it stops. */
export function moveTo(store: SimulatorStore, step: number): void {
  const { run } = store.getState();
  if (run === null) return;
  while (run.history.length < step && run.status === 'running') store.getState().stepForward();
  while (run.history.length > step) store.getState().stepBack();
}

