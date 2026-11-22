// @vitest-environment jsdom
import { act, cleanup, fireEvent, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithIntl } from '@/test/intl';
import { BombeLab } from './BombeLab';
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
});

/** Runs the search at once, on this thread, instead of in a worker. */
const searchNow: SearchRunner = (request, onReport) => {
  runSearch(request, onReport);
  return () => {};
};

describe('BombeLab (spec R4 3)', () => {
  it('puts the crib, the menu, the drum wall and the stops in this order, for phones', () => {
    renderWithIntl(<BombeLab search={searchNow} />);
    expect(screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)).toEqual(['Crib', 'Menu: no loops', 'The Bombe', 'Stops']);
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

