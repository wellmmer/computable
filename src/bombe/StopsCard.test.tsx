// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseTryHash } from '@/enigma/try-link';
import { renderWithIntl } from '@/test/intl';
import fr from '../../messages/fr.json';
import { NO_SEARCH, type Search } from './lab-state';
import { PRACTICE } from './practice-message';
import { StopsCard } from './StopsCard';

// The real Link needs the Next.js router, which screen tests do not have.
vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

afterEach(cleanup);

const STOP = { rotors: ['II', 'III', 'V'], start: ['Q', 'K', 'A'], plugs: ['AH', 'BP', 'EX', 'KW', 'MR', 'NT', 'VZ'] } as const;
const finished: Search = { ...NO_SEARCH, status: 'finished', total: 60, done: 60, stops: [STOP], count: 1 };

describe('StopsCard (spec R4 3, "Stops card")', () => {
  it('asks for a search before the first one', () => {
    renderWithIntl(<StopsCard search={NO_SEARCH} cipher={PRACTICE.cipher} />);
    expect(screen.getByText('No stops yet. Press Start.')).toBeTruthy();
  });

  it('lists each stop: rotor order, start, plug pairs, and a link that loads it into the Enigma lab', () => {
    renderWithIntl(<StopsCard search={finished} cipher={PRACTICE.cipher} />);
    expect(screen.getByText('II III V · start Q K A')).toBeTruthy();
    expect(screen.getByText('Plug pairs found: AH BP EX KW MR NT VZ')).toBeTruthy();
    const link = screen.getByRole('link', { name: 'Try in the Enigma lab: II III V, Q K A' });
    const [path, hash] = (link.getAttribute('href') ?? '').split('#');
    expect(path).toBe('/enigma');
    expect(parseTryHash(`#${hash}`)).toEqual({ settings: { rotors: ['II', 'III', 'V'], rings: ['A', 'A', 'A'], reflector: 'B', plugs: STOP.plugs }, start: ['Q', 'K', 'A'], cipher: PRACTICE.cipher });
    expect(screen.getByText('Letters the menu never reached stay unknown.')).toBeTruthy();
  });

  it('says when a finished search found no stop', () => {
    renderWithIntl(<StopsCard search={{ ...finished, stops: [], count: 0 }} cipher={PRACTICE.cipher} />);
    expect(screen.getByText('No stops. Check the crib and its place.')).toBeTruthy();
  });

  it('does not blame the crib when the visitor stopped the search before any stop', () => {
    renderWithIntl(<StopsCard search={{ ...finished, status: 'stopped', done: 3, stops: [], count: 0 }} cipher={PRACTICE.cipher} />);
    expect(screen.queryByText('No stops. Check the crib and its place.')).toBeNull();
    expect(screen.getByText('Search stopped before any stop.')).toBeTruthy();
  });

  it('names the link with the spacing of each language: French puts a space before the colon', () => {
    render(
      <NextIntlClientProvider locale="fr" messages={fr}>
        <StopsCard search={finished} cipher={PRACTICE.cipher} />
      </NextIntlClientProvider>,
    );
    expect(screen.getByRole('link', { name: 'Essayer dans le labo Enigma : II III V, Q K A' })).toBeTruthy();
  });

  it('marks the stop that matches the key of Home’s secret (spec R4 4)', () => {
    const other = { ...STOP, start: ['Q', 'K', 'B'] } as const;
    renderWithIntl(<StopsCard search={{ ...finished, stops: [STOP, other], count: 2 }} cipher={PRACTICE.cipher} yourKey={{ settings: PRACTICE.settings, start: PRACTICE.start }} />);
    const [first, second] = screen.getAllByRole('listitem');
    expect(first.textContent).toContain('✓ This is your key');
    expect(second.textContent).not.toContain('This is your key');
  });

  it('marks no stop without a secret on Home', () => {
    renderWithIntl(<StopsCard search={finished} cipher={PRACTICE.cipher} yourKey={null} />);
    expect(screen.queryByText('This is your key')).toBeNull();
  });

  it('counts the stops the list leaves out', () => {
    renderWithIntl(<StopsCard search={{ ...finished, count: 1054537 }} cipher={PRACTICE.cipher} />);
    expect(screen.getByText('1,054,537 stops. The list shows the first 1.')).toBeTruthy();
  });
});
