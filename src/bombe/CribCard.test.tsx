// @vitest-environment jsdom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { useReducer } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { renderWithIntl } from '@/test/intl';
import { CribCard } from './CribCard';
import { bombeReducer, initialLab } from './lab-state';

afterEach(cleanup);

/** The card with the lab's own state, as the page holds it. */
function Lab() {
  const [lab, dispatch] = useReducer(bombeReducer, undefined, initialLab);
  return <CribCard lab={lab} dispatch={dispatch} />;
}

const slide = (direction: 'left' | 'right') => fireEvent.click(screen.getByRole('button', { name: `Slide the crib ${direction}` }));

describe('CribCard (spec R4 3, "Crib card")', () => {
  it('starts with the crib WETTERBERICHT and no secret letters, so nothing is laid out yet', () => {
    renderWithIntl(<Lab />);
    expect(screen.getByRole<HTMLInputElement>('textbox', { name: 'Crib: a word you know is in the message' }).value).toBe('WETTERBERICHT');
    expect(screen.getByRole<HTMLTextAreaElement>('textbox', { name: 'Secret letters' }).value).toBe('');
    expect(screen.queryByRole('button', { name: 'Slide the crib right' })).toBeNull();
  });

  it('takes at most 2,000 characters of secret letters, so the search can count every key press', () => {
    renderWithIntl(<Lab />);
    expect(screen.getByRole<HTMLTextAreaElement>('textbox', { name: 'Secret letters' }).maxLength).toBe(2000);
  });

  it('loads the practice message and lays the crib under its first letters, where it fits', () => {
    renderWithIntl(<Lab />);
    fireEvent.click(screen.getByRole('button', { name: 'Load the practice message' }));
    expect(screen.getByRole<HTMLTextAreaElement>('textbox', { name: 'Secret letters' }).value.startsWith('HXHIC IRWHZ RQWGL')).toBe(true);
    expect(screen.getByText('Place 1 of 72')).toBeTruthy();
    expect(screen.getByText('Secret letters at this place: HXHICIRWHZRQW. Crib: WETTERBERICHT.')).toBeTruthy();
    expect(screen.getByText('No letter turns into itself here.')).toBeTruthy();
  });

  it('slides the crib, and shows a crash in red where a letter would turn into itself', () => {
    renderWithIntl(<Lab />);
    fireEvent.click(screen.getByRole('button', { name: 'Load the practice message' }));
    slide('right');
    expect(screen.getByText('Place 2 of 72')).toBeTruthy();
    // The crib's R sits on the secret R at place 2.
    expect(screen.getByText('✗ 1 letter would turn into itself (red). Enigma never does that, so the crib cannot sit here.')).toBeTruthy();
    expect(document.querySelectorAll('[data-crash]')).toHaveLength(1);
    expect(document.querySelector('[data-crash]')?.textContent).toBe('RR');
    slide('left');
    slide('left');
    expect(screen.getByText('Place 1 of 72')).toBeTruthy();
  });

  it('breaks Barbarossa part 1: fills its secret letters and its crib at letter 37, and says why the start is not B L A (spec R4 5)', () => {
    renderWithIntl(<Lab />);
    const rings = 'The real key used rings B U L and start B L A. The Bombe assumes rings A A A, so it finds start A Q P instead.';
    expect(screen.queryByText(rings, { exact: false })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Break part 1 with the Bombe' }));
    expect(screen.getByRole<HTMLTextAreaElement>('textbox', { name: 'Secret letters' }).value.startsWith('EDPUD NRGYS ZRCXN')).toBe(true);
    expect(screen.getByRole<HTMLInputElement>('textbox', { name: 'Crib: a word you know is in the message' }).value).toBe('OWAXNORDWESTLXSE');
    expect(screen.getByText('Place 37 of 159')).toBeTruthy();
    expect(screen.getByText('No letter turns into itself here.')).toBeTruthy();
    expect(screen.getByText(rings, { exact: false })).toBeTruthy();
    slide('right');
    expect(screen.queryByText(rings, { exact: false })).toBeNull();
  });

  it('gives the hints for a short crib without a loop, and says when the crib is too long', () => {
    renderWithIntl(<Lab />);
    fireEvent.click(screen.getByRole('button', { name: 'Load the practice message' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Crib: a word you know is in the message' }), { target: { value: 'wetter' } });
    expect(screen.getByText('Tip: use a crib of 15 letters or more. A short crib gives many false stops.')).toBeTruthy();
    expect(screen.getByText('Tip: this menu has no loop. Slide the crib or make it longer to get fewer false stops.')).toBeTruthy();
    fireEvent.change(screen.getByRole('textbox', { name: 'Secret letters' }), { target: { value: 'ABC' } });
    expect(screen.getByText('The crib is longer than the secret letters.')).toBeTruthy();
  });
});
