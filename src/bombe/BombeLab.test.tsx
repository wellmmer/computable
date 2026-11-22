// @vitest-environment jsdom
import { act, cleanup, fireEvent, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { encrypt } from '@/engines/enigma';
import { MY_SECRET_HASH } from '@/home/secret-link';
import { SECRET_KEY, type SavedSecret } from '@/home/secret-storage';
import { renderWithIntl } from '@/test/intl';
import { BombeLab } from './BombeLab';
import { PRACTICE } from './practice-message';
import { runSearch } from './run-search';
import { TEST_ORDERS_KEY } from './search-orders';
import type { SearchReport } from './search-messages';
import type { SearchRunner } from './worker-search';

// The real Link needs the Next.js router, which screen tests do not have.
vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  localStorage.clear();
  window.history.replaceState(null, '', '/');
});

/** Runs the search at once, on this thread, instead of in a worker. */
const searchNow: SearchRunner = (request, onReport) => {
  runSearch(request, onReport);
  return () => {};
};

describe('BombeLab (spec R4 3)', () => {
  it('puts the crib, the menu, the drum wall, slow step mode and the stops in this order, for phones', () => {
    renderWithIntl(<BombeLab search={searchNow} />);
    expect(screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)).toEqual(['Crib', 'Menu: no loops', 'The Bombe', 'One test, step by step', 'Stops']);
  });

  it('marks the link in use on the menu drawing and the drum wall in slow step mode (spec R4 4)', () => {
    sessionStorage.setItem(TEST_ORDERS_KEY, 'II III V');
    renderWithIntl(<BombeLab search={searchNow} />);
    fireEvent.click(screen.getByRole('button', { name: 'Load the practice message' }));
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    fireEvent.click(screen.getByRole('button', { name: 'Watch one test slowly' }));
    expect(document.querySelectorAll('[data-active]')).toHaveLength(0);
    // Step 3 is the first link: the current leaves the center letter H.
    fireEvent.click(screen.getByRole('button', { name: 'Step' }));
    fireEvent.click(screen.getByRole('button', { name: 'Step' }));
    const link = Number(/^Through link (\d+)/.exec(screen.getByTestId('slow-sentence').textContent ?? '')?.[1]) - 1;
    expect(document.querySelector('path[data-active]')?.getAttribute('data-link')).toBe(String(link));
    const wall = [...document.querySelectorAll('[data-enigma]')];
    expect(wall.findIndex((enigma) => enigma.hasAttribute('data-active'))).toBe(link < 12 ? link : -1);
    // The wall shows the slow test: the practice key, Q K A.
    expect(wall[0].textContent).toBe('QKB');
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    expect(screen.queryByTestId('slow-sentence')).toBeNull();
  });

  it('breaks the practice message: 1 rotor order with the test setting, 1 stop, the key', () => {
    sessionStorage.setItem(TEST_ORDERS_KEY, 'II III V');
    renderWithIntl(<BombeLab search={searchNow} />);
    fireEvent.click(screen.getByRole('button', { name: 'Load the practice message' }));
    expect(screen.getByRole('heading', { level: 2, name: 'Menu: 3 loops' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    expect(screen.getByRole('status').textContent).toBe('Finished: 1 rotor order tested. 1 stop.');
    expect(screen.getByText('II III V · start Q K A')).toBeTruthy();
    expect(screen.getByText('Plug pairs found: AH BP EX KW MR NT VZ')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Try in the Enigma lab: II III V, Q K A' })).toBeTruthy();
  });

  it('stops a search when asked, and ends the worker', () => {
    const end = vi.fn();
    const never: SearchRunner = () => end;
    renderWithIntl(<BombeLab search={never} />);
    fireEvent.click(screen.getByRole('button', { name: 'Load the practice message' }));
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
    expect(end).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('status').textContent).toBe('Stopped after 0 of 60 rotor orders.');
  });

  it('says when the search cannot run, and lets the visitor start again', () => {
    const broken: SearchRunner = (_request, onReport) => {
      onReport({ type: 'failed' });
      return () => {};
    };
    renderWithIntl(<BombeLab search={broken} />);
    fireEvent.click(screen.getByRole('button', { name: 'Load the practice message' }));
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    expect(screen.getByRole('status').textContent).toBe('The search could not run. Reload the page and try again.');
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Start' }).disabled).toBe(false);
  });

  it('ignores a late report from an old search', () => {
    const searches: { onReport: (report: SearchReport) => void; end: () => void }[] = [];
    const held: SearchRunner = (_request, onReport) => {
      const end = vi.fn();
      searches.push({ onReport, end });
      return end;
    };
    renderWithIntl(<BombeLab search={held} />);
    fireEvent.click(screen.getByRole('button', { name: 'Load the practice message' }));
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    act(() => searches[0].onReport({ type: 'finished' }));
    expect(screen.getByRole('button', { name: 'Stop' })).toBeTruthy();
    expect(screen.getByRole('status').textContent).toBe('');
    expect(searches[1].end).not.toHaveBeenCalled();
  });
});

describe('Home’s secret on the Bombe (spec R4 4)', () => {
  const SECRET: SavedSecret = { plain: PRACTICE.plain, cipher: encrypt(PRACTICE.settings, PRACTICE.start, PRACTICE.plain), settings: PRACTICE.settings, start: PRACTICE.start };
  const field = (name: string) => screen.getByRole<HTMLTextAreaElement | HTMLInputElement>('textbox', { name });

  it('fills the secret letters from "Break it with the Bombe", leaves the crib empty, and drops the link', () => {
    localStorage.setItem(SECRET_KEY, JSON.stringify(SECRET));
    window.history.replaceState(null, '', `/en/bombe${MY_SECRET_HASH}`);
    renderWithIntl(<BombeLab search={searchNow} />);
    expect(field('Secret letters').value.slice(0, 11)).toBe('HXHIC IRWHZ');
    expect(field('Crib: a word you know is in the message').value).toBe('');
    expect(window.location.hash).toBe('');
  });

  it('marks the stop that matches the saved key: "This is your key"', () => {
    sessionStorage.setItem(TEST_ORDERS_KEY, 'II III V');
    localStorage.setItem(SECRET_KEY, JSON.stringify(SECRET));
    window.history.replaceState(null, '', `/en/bombe${MY_SECRET_HASH}`);
    renderWithIntl(<BombeLab search={searchNow} />);
    fireEvent.change(field('Crib: a word you know is in the message'), { target: { value: 'WETTERBERICHT' } });
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    expect(screen.getByRole('listitem').textContent).toContain('✓ This is your key');
  });

  it('keeps the link while a search runs, and fills the secret letters when the search ends', () => {
    const reports: ((report: SearchReport) => void)[] = [];
    const held: SearchRunner = (_request, onReport) => {
      reports.push(onReport);
      return () => {};
    };
    localStorage.setItem(SECRET_KEY, JSON.stringify({ ...SECRET, cipher: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' }));
    renderWithIntl(<BombeLab search={held} />);
    fireEvent.click(screen.getByRole('button', { name: 'Load the practice message' }));
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    act(() => {
      window.history.replaceState(null, '', `/en/bombe${MY_SECRET_HASH}`);
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    expect(field('Secret letters').value.slice(0, 11)).toBe('HXHIC IRWHZ');
    expect(window.location.hash).toBe(MY_SECRET_HASH);
    act(() => reports[0]({ type: 'finished' }));
    expect(field('Secret letters').value.slice(0, 11)).toBe('ABCDE FGHIJ');
    expect(window.location.hash).toBe('');
  });

  it('opens nothing without a secret in this browser', () => {
    window.history.replaceState(null, '', `/en/bombe${MY_SECRET_HASH}`);
    renderWithIntl(<BombeLab search={searchNow} />);
    expect(field('Secret letters').value).toBe('');
  });
});
