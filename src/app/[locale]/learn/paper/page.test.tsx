// @vitest-environment jsdom
import { cleanup, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { routing } from '@/i18n/routing';
import { renderWithIntl } from '@/test/intl';
import PaperPage from './page';

// The real Link needs the Next.js router, which screen tests do not have.
vi.mock('@/i18n/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/i18n/navigation')>()),
  Link: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

afterEach(cleanup);

/** The 13 blocks of the guide, in page order. */
const parts = () => [...document.querySelectorAll('[data-paper-part]')];

describe('the reading guide to Turing’s paper (spec R2c 3)', () => {
  it('opens with the title, the DOI link and the line that it quotes the paper and does not reproduce it', () => {
    renderWithIntl(<PaperPage />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Turing’s 1936 paper');
    expect(screen.getByRole('link', { name: 'doi.org/10.1112/plms/s2-42.1.230' }).getAttribute('href')).toBe(
      'https://doi.org/10.1112/plms/s2-42.1.230',
    );
    expect(screen.getByText('This guide quotes the paper and does not reproduce it.')).toBeTruthy();
  });

  it('shows one block per part, with its pages, title and summary', () => {
    renderWithIntl(<PaperPage />);
    expect(parts()).toHaveLength(13);
    const first = within(parts()[0] as HTMLElement);
    expect(first.getByText('Volume 42, pages 231–232')).toBeTruthy();
    expect(first.getByRole('heading', { level: 2 }).textContent).toBe('1. Computing machines');
    expect(first.getByText(/^Turing compares a person who computes a number with a machine\. The machine has/)).toBeTruthy();
    const last = within(parts()[12] as HTMLElement);
    expect(last.getByText('Volume 43, pages 544–546')).toBeTruthy();
    expect(last.getByRole('link', { name: 'Read the correction on the publisher’s site' }).getAttribute('href')).toBe(
      'https://doi.org/10.1112/plms/s2-43.6.544',
    );
  });

  it('quotes Turing in English, with the page, and links the lessons that explain the part', () => {
    renderWithIntl(<PaperPage />);
    const section8 = within(parts()[7] as HTMLElement);
    const quote = section8.getByRole('blockquote');
    expect(quote.getAttribute('lang')).toBe('en');
    expect(quote.textContent).toBe(
      '“In fact, by applying the diagonal process argument correctly, we can show that there cannot be any such general process.”',
    );
    expect(section8.getByText('(Turing, 1936, page 246)')).toBeTruthy();
    expect(section8.getAllByRole('link').map((link) => [link.textContent, link.getAttribute('href')])).toEqual([
      ['Lesson 4: The halting problem', '/learn/halting-problem'],
      ['Lesson 5: The Entscheidungsproblem', '/learn/entscheidungsproblem'],
    ]);
    // The English page shows no translation.
    expect(screen.queryByText(/^Translation:/)).toBeNull();
  });

  it.each(routing.locales.filter((locale) => locale !== 'en'))('in %s, keeps every quote in the same English and adds a translation', (locale) => {
    renderWithIntl(<PaperPage />);
    const english = screen.getAllByRole('blockquote').map((quote) => quote.textContent);
    cleanup();
    renderWithIntl(<PaperPage />, locale);
    expect(screen.getAllByRole('blockquote').map((quote) => quote.textContent)).toEqual(english);
    expect(english).toHaveLength(12);
    // The test renders the English UI texts, so the label is English; the quoted words are the translation.
    expect(screen.getAllByText(/^Translation: /)).toHaveLength(12);
  });

  it('puts the tape before the first part, so it stays on screen while the parts scroll by', () => {
    renderWithIntl(<PaperPage />);
    const tape = screen.getByTestId('paper-tape');
    expect(tape.parentElement).toBe(parts()[0].parentElement);
    expect(tape.compareDocumentPosition(parts()[0]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
