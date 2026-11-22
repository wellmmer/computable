// @vitest-environment jsdom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildMenu, ROTOR_ORDERS, startIndex } from '@/engines/bombe';
import { renderWithIntl } from '@/test/intl';
import { DrumWall } from './DrumWall';
import { NO_SEARCH, type Search } from './lab-state';
import { PRACTICE } from './practice-message';

afterEach(cleanup);

const menu = buildMenu(PRACTICE.cipher, PRACTICE.crib, 0);
const ORDER = [PRACTICE.settings.rotors];
const running: Search = { ...NO_SEARCH, status: 'running', total: 1, testing: { order: 0, start: startIndex(['Q', 'K', 'A']) } };

/** The letters on the drums of each Enigma, top to bottom. */
const enigmas = () => [...document.querySelectorAll('[data-enigma]')].map((enigma) => enigma.textContent);

function wall(props: Partial<Parameters<typeof DrumWall>[0]> = {}) {
  const handlers = { onStart: vi.fn(), onStop: vi.fn() };
  renderWithIntl(<DrumWall menu={menu} search={NO_SEARCH} orders={ROTOR_ORDERS} reducedMotion={false} blocked={null} {...handlers} {...props} />);
  return handlers;
}

describe('DrumWall (spec R4 3, "Drum wall")', () => {
  it('shows one Enigma for each of the first 12 links, with 3 drums each, at the first start', () => {
    wall();
    expect(document.querySelectorAll('[data-enigma]')).toHaveLength(12);
    expect(document.querySelectorAll('[data-drum]')).toHaveLength(36);
    // Rotors I II III from A A A: the first letter meets A A B.
    expect(enigmas()[0]).toBe('AAB');
    expect(screen.getByText('Rotor order 0 of 60')).toBeTruthy();
    expect(screen.getByText('No stops')).toBeTruthy();
  });

  it('starts and stops the search', () => {
    const { onStart } = wall();
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    expect(onStart).toHaveBeenCalled();
    cleanup();
    const { onStop } = wall({ search: running, orders: ORDER });
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
    expect(onStop).toHaveBeenCalled();
  });

  it('turns the drums to the start under test, and names the rotor order', () => {
    wall({ search: running, orders: ORDER });
    expect(enigmas()[0]).toBe('QKB');
    expect(screen.getByText('Rotor order 1 of 1')).toBeTruthy();
    expect(screen.getByText('Testing rotors II III V')).toBeTruthy();
  });

  it('keeps the drums still with reduced motion; only the counter changes', () => {
    wall({ search: running, orders: ORDER, reducedMotion: true });
    expect(enigmas()[0]).toBe('AAB');
    expect(screen.getByText('Rotor order 1 of 1')).toBeTruthy();
  });

  it('says why Start is off', () => {
    wall({ blocked: 'crash' });
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Start' }).disabled).toBe(true);
    expect(screen.getByText('Slide the crib to a place without red letters to start.')).toBeTruthy();
  });

  it('says when the search is finished, and shows the progress', () => {
    wall({ search: { ...running, status: 'finished', done: 1, count: 1 }, orders: ORDER });
    expect(screen.getByRole('status').textContent).toBe('Finished: 1 rotor order tested. 1 stop.');
    expect(screen.getByRole('progressbar', { name: 'Rotor orders tested' }).getAttribute('aria-valuenow')).toBe('1');
    expect(screen.queryByText(/^Testing rotors/)).toBeNull();
  });

  it('says how many Enigmas a long menu needs', () => {
    wall({ menu: buildMenu(PRACTICE.cipher, 'WETTERBERICHTXNORD', 0) });
    expect(screen.getByText('The wall shows 12 of the 18 Enigmas.')).toBeTruthy();
  });
});
