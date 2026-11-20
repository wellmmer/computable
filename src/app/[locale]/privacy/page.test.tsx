// @vitest-environment jsdom
import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { renderWithIntl } from '@/test/intl';
import PrivacyPage from './page';

afterEach(cleanup);

describe('Privacy (spec 4.2)', () => {
  it('says what stays in the browser, what the site counts and how donations work', () => {
    renderWithIntl(<PrivacyPage />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Privacy');
    expect(screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)).toEqual([
      'What stays in your browser',
      'What the site counts',
      'Donations',
    ]);
    expect(screen.getByText(/the site counts visits with Vercel Web Analytics\. It sets no cookies\./)).toBeTruthy();
  });

  it('names the one cookie, which keeps the language for a year (spec 3, "Language on first visit")', () => {
    renderWithIntl(<PrivacyPage />);
    expect(screen.getByText('Computable has no accounts and keeps no personal data about you. It sets one cookie, only to remember your language.')).toBeTruthy();
    expect(screen.getByText(/The language is also in a cookie named NEXT_LOCALE, for one year\./)).toBeTruthy();
  });

  it('says that quiz results stay in this browser only (spec R2a 4)', () => {
    renderWithIntl(<PrivacyPage />);
    expect(screen.getByText('Your quiz results stay in this browser only.')).toBeTruthy();
  });

  it('says that Home’s secret stays in this browser, and how to delete it (spec R3 4)', () => {
    renderWithIntl(<PrivacyPage />);
    expect(
      screen.getByText('Home’s secret message, its secret letters and the Enigma settings stay in this browser only. “Forget my secret” deletes them.'),
    ).toBeTruthy();
  });

  it('says the counter never receives the machine from a share link (spec 5.6)', () => {
    renderWithIntl(<PrivacyPage />);
    expect(
      screen.getByText(
        'It counts the page address without the part after the # sign. So it never receives the machine from a share link.',
      ),
    ).toBeTruthy();
  });

  it("links the analytics service's privacy notes and the repo's issues", () => {
    renderWithIntl(<PrivacyPage />);
    expect(screen.getByRole('link', { name: 'How Vercel Web Analytics handles privacy' }).getAttribute('href')).toBe(
      'https://vercel.com/docs/analytics/privacy-policy',
    );
    expect(screen.getByRole('link', { name: 'Open an issue on GitHub' }).getAttribute('href')).toBe(
      'https://github.com/wellmmer/computable/issues',
    );
  });
});
