// @vitest-environment jsdom
import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithIntl } from '@/test/intl';
import PrivacyPage from './page';

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

/** Sets the 2 Supabase values, as the build with accounts has them (spec R5b 2). */
function withAccounts() {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'public-key');
}

/** Removes the 2 Supabase values, as the build without accounts has them. */
function withoutAccounts() {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '');
}

describe('Privacy (spec 4.2)', () => {
  it('says what stays in the browser, what the site counts and how donations work', () => {
    withoutAccounts();
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
    withoutAccounts();
    renderWithIntl(<PrivacyPage />);
    expect(
      screen.getByText('Computable has no accounts and keeps no personal data about you. It sets one cookie, only to remember your language.'),
    ).toBeTruthy();
    expect(screen.getByText(/The language is also in a cookie named NEXT_LOCALE, for one year\./)).toBeTruthy();
  });

  it('without the 2 Supabase values, says nothing about accounts (spec R5b 2)', () => {
    withoutAccounts();
    renderWithIntl(<PrivacyPage />);
    expect(screen.queryByRole('region', { name: 'Optional accounts' })).toBeNull();
    expect(screen.queryByText(/Supabase/)).toBeNull();
  });

  it('with the 2 Supabase values, says accounts are optional, before the accounts section (spec R5b 4)', () => {
    withAccounts();
    renderWithIntl(<PrivacyPage />);
    expect(
      screen.getByText('Accounts are optional. Without one, Computable keeps no personal data about you. It sets one cookie, only to remember your language.'),
    ).toBeTruthy();
    expect(screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)).toEqual([
      'What stays in your browser',
      'Optional accounts',
      'What the site counts',
      'Donations',
    ]);
  });

  it('says what an account stores, where, and how to delete it (spec R5b 4)', () => {
    withAccounts();
    renderWithIntl(<PrivacyPage />);
    const section = screen.getByRole('region', { name: 'Optional accounts' });
    expect(section.textContent).toContain('You can sign in with Google or GitHub. Your account then keeps your name or email from that service.');
    expect(section.textContent).toContain('A later update will also keep your current machine and your quiz scores in it.');
    expect(section.textContent).toContain('Supabase stores your account. Its servers are in the region chosen when the project is created.');
    expect(section.textContent).toContain('Your browser keeps the sign-in in its local storage, not in a cookie.');
    expect(section.textContent).toContain(
      '“Delete my account” in the account menu deletes your account and everything saved in it. This browser keeps its own copy.',
    );
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
