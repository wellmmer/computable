// @vitest-environment jsdom
import { act, cleanup, fireEvent, screen } from '@testing-library/react';
import { useReducer } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ROTOR_ORDERS } from '@/engines/bombe';
import { renderWithIntl } from '@/test/intl';
import { bombeReducer, initialLab, NO_SEARCH, type BombeLab } from './lab-state';
import { PRACTICE } from './practice-message';
import { PLAY_STEP_MS, SlowTestCard } from './SlowTestCard';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

/** The practice message, before any search. */
const PRACTICE_LAB = bombeReducer(initialLab(), { type: 'practice' });
/** The practice message after a search whose first stop is the practice key. */
const FINISHED: BombeLab = {
  ...PRACTICE_LAB,
  search: { ...NO_SEARCH, status: 'finished', total: 1, done: 1, stops: [{ rotors: PRACTICE.settings.rotors, start: PRACTICE.start, plugs: ['AH'] }], count: 1 },
};

/** The card with the lab's real reducer behind it. */
function Card({ lab: first }: { lab: BombeLab }) {
  const [lab, dispatch] = useReducer(bombeReducer, first);
  return <SlowTestCard lab={lab} orders={ROTOR_ORDERS} dispatch={dispatch} />;
}

const button = (name: string) => screen.getByRole<HTMLButtonElement>('button', { name });
const sentence = () => screen.getByTestId('slow-sentence').textContent;

describe('SlowTestCard (spec R4 4, slow step mode)', () => {
  it('opens the first stop at its first step, and moves the focus to Step', () => {
    renderWithIntl(<Card lab={FINISHED} />);
    fireEvent.click(button('Watch one test slowly'));
    expect(screen.getByText('Rotors II III V, start Q K A')).toBeTruthy();
    expect(screen.getByText('Step 1 of 18')).toBeTruthy();
    expect(sentence()).toBe('The test current enters H on wire A. This is the guess “H is plugged to A”.');
    expect(screen.getByText('H: 1 of 26 wires lit')).toBeTruthy();
    expect(document.activeElement).toBe(button('Step'));
    expect(button('Back').disabled).toBe(true);
  });

  it('says each step in one sentence: the mirror wire, a link, and the stop at the end', () => {
    renderWithIntl(<Card lab={FINISHED} />);
    fireEvent.click(button('Watch one test slowly'));
    fireEvent.click(button('Step'));
    expect(sentence()).toBe('The diagonal board adds the mirror wire: A on wire H.');
    fireEvent.click(button('Step'));
    expect(sentence()).toMatch(/^Through link \d+ \([A-Z] on [A-Z]\), [A-Z] on wire [A-Z] lights [A-Z] on wire [A-Z]\.$/);
    for (let step = 3; step < 18; step++) fireEvent.click(button('Step'));
    expect(screen.getByText('Step 18 of 18')).toBeTruthy();
    expect(sentence()).toMatch(/^Stop: only \d+ of 26 wires of H lit\.$/);
    expect(button('Step').disabled).toBe(true);
    expect(document.activeElement).toBe(button('Back'));
    fireEvent.click(button('Back'));
    expect(screen.getByText('Step 17 of 18')).toBeTruthy();
  });

  it('ends with "all 26 wires lit: no stop" at a start without a stop', () => {
    // No search yet: the test is the first rotor order at A A A.
    renderWithIntl(<Card lab={PRACTICE_LAB} />);
    fireEvent.click(button('Watch one test slowly'));
    expect(screen.getByText('Rotors I II III, start A A A')).toBeTruthy();
    const total = Number(/of (\d+)$/.exec(screen.getByText(/^Step 1 of/).textContent ?? '')?.[1]);
    for (let step = 1; step < total; step++) fireEvent.click(button('Step'));
    expect(sentence()).toBe('All 26 wires of H lit: no stop.');
    expect(screen.getByText('H: 26 of 26 wires lit')).toBeTruthy();
  });

  it('ends with "not a stop" when fewer than 26 wires lit but every guess gives a letter two partners', () => {
    // The fast search finds no stop here, so slow step mode must not say "Stop".
    const typed = [{ type: 'secret', text: 'PBJGOLIZQMQG' }, { type: 'crib', text: 'WETTERBERICH' }, { type: 'slow-open', rotors: ['IV', 'V', 'II'], start: ['A', 'A', 'A'] }] as const;
    const opened = typed.reduce<BombeLab>(bombeReducer, initialLab());
    const last = (opened.slow?.steps.length ?? 0) - 1;
    renderWithIntl(<Card lab={{ ...opened, slow: opened.slow && { ...opened.slow, at: last } }} />);
    expect(sentence()).toBe('Only 1 of 26 wires of E lit. But every guess for E gives a letter two partners, so this is not a stop.');
  });

  describe('Play', () => {
    beforeEach(() => vi.useFakeTimers());

    it('steps on its own, pauses, and stops at the last step', () => {
      renderWithIntl(<Card lab={FINISHED} />);
      fireEvent.click(button('Watch one test slowly'));
      fireEvent.click(button('Play'));
      act(() => vi.advanceTimersByTime(PLAY_STEP_MS * 2));
      expect(screen.getByText('Step 3 of 18')).toBeTruthy();
      fireEvent.click(button('Pause'));
      act(() => vi.advanceTimersByTime(PLAY_STEP_MS * 2));
      expect(screen.getByText('Step 3 of 18')).toBeTruthy();
      fireEvent.click(button('Play'));
      act(() => vi.advanceTimersByTime(PLAY_STEP_MS * 30));
      expect(screen.getByText('Step 18 of 18')).toBeTruthy();
      expect(button('Play').disabled).toBe(true);
    });

    it('stops playing at the last step: Back then stays on the step before it, and the button reads Play', () => {
      renderWithIntl(<Card lab={FINISHED} />);
      fireEvent.click(button('Watch one test slowly'));
      fireEvent.click(button('Play'));
      act(() => vi.advanceTimersByTime(PLAY_STEP_MS * 30));
      expect(screen.getByText('Step 18 of 18')).toBeTruthy();
      fireEvent.click(button('Back'));
      act(() => vi.advanceTimersByTime(PLAY_STEP_MS * 3));
      expect(screen.getByText('Step 17 of 18')).toBeTruthy();
      expect(button('Play').disabled).toBe(false);
    });

    it('pauses when the visitor presses Back or Step', () => {
      renderWithIntl(<Card lab={FINISHED} />);
      fireEvent.click(button('Watch one test slowly'));
      fireEvent.click(button('Play'));
      act(() => vi.advanceTimersByTime(PLAY_STEP_MS * 3));
      fireEvent.click(button('Back'));
      act(() => vi.advanceTimersByTime(PLAY_STEP_MS * 3));
      expect(screen.getByText('Step 3 of 18')).toBeTruthy();
      fireEvent.click(button('Play'));
      act(() => vi.advanceTimersByTime(PLAY_STEP_MS));
      fireEvent.click(button('Step'));
      act(() => vi.advanceTimersByTime(PLAY_STEP_MS * 3));
      expect(screen.getByText('Step 5 of 18')).toBeTruthy();
      expect(button('Play')).toBeTruthy();
    });

    it('reads aloud only the step the visitor asked for, and the last step after Play', () => {
      renderWithIntl(<Card lab={FINISHED} />);
      fireEvent.click(button('Watch one test slowly'));
      const status = screen.getByTestId('slow-news');
      expect(status.textContent).toBe(sentence());
      fireEvent.click(button('Play'));
      act(() => vi.advanceTimersByTime(PLAY_STEP_MS));
      expect(status.textContent).toBe('');
      act(() => vi.advanceTimersByTime(PLAY_STEP_MS * 30));
      expect(status.textContent).toMatch(/^Stop:/);
    });
  });

  it('closes, and gives the focus back to "Watch one test slowly"', () => {
    renderWithIntl(<Card lab={FINISHED} />);
    fireEvent.click(button('Watch one test slowly'));
    fireEvent.click(button('Close'));
    expect(screen.queryByTestId('slow-sentence')).toBeNull();
    expect(document.activeElement).toBe(button('Watch one test slowly'));
  });

  it('cannot open while Start is blocked', () => {
    renderWithIntl(<Card lab={initialLab()} />);
    expect(button('Watch one test slowly').disabled).toBe(true);
  });
});
