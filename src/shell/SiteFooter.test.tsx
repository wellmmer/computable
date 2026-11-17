// @vitest-environment jsdom
import { cleanup, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithIntl } from '@/test/intl';
import { SiteFooter } from './SiteFooter';

const navigation = vi.hoisted(() => ({ pathname: '/simulator' }));

// The real Link and usePathname need the Next.js router, which screen tests do not have.
vi.mock('@/i18n/navigation', () => ({
  usePathname: () => navigation.pathname,
  Link: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

afterEach(() => {
  cleanup();
  navigation.pathname = '/simulator';
});

describe('SiteFooter', () => {
  it('links About, Privacy, Support the dev and the source code, and names both licenses', () => {
    renderWithIntl(<SiteFooter />);
    const links = within(screen.getByRole('navigation', { name: 'Site' })).getAllByRole('link');
    expect(links.map((link) => [link.textContent, link.getAttribute('href')])).toEqual([
      ['About', '/about'],
      ['Privacy', '/privacy'],
      ['Support the dev', '/support'],
      ['Source code', 'https://github.com/wellmmer/computable'],
    ]);
    expect(screen.getByText('Code under the MIT license. Texts under CC BY 4.0.')).toBeTruthy();
  });

  it('asks for help with the translation on pages that an AI translated (spec 3)', () => {
    for (const locale of ['es', 'fr', 'de'] as const) {
      renderWithIntl(<SiteFooter />, locale);
      expect(screen.getByRole('link', { name: 'Help improve the translation' }).getAttribute('href')).toBe(
        `https://github.com/wellmmer/computable/edit/master/messages/${locale}.json`,
      );
      cleanup();
    }
  });

  it('on a lesson page, links the lesson file of that language, where the lesson text lives', () => {
    navigation.pathname = '/learn/intuition';
    for (const locale of ['es', 'fr', 'de'] as const) {
      renderWithIntl(<SiteFooter />, locale);
      expect(screen.getByRole('link', { name: 'Help improve the translation' }).getAttribute('href')).toBe(
        `https://github.com/wellmmer/computable/edit/master/content/lessons/intuition/${locale}.mdx`,
      );
      cleanup();
    }
  });

  it('on the Learn page and on an unknown lesson address, links the language file', () => {
    for (const pathname of ['/learn', '/learn/nope']) {
      navigation.pathname = pathname;
      renderWithIntl(<SiteFooter />, 'de');
      expect(screen.getByRole('link', { name: 'Help improve the translation' }).getAttribute('href')).toBe(
        'https://github.com/wellmmer/computable/edit/master/messages/de.json',
      );
      cleanup();
    }
  });

  it('says nothing about translation in English and in the checked Brazilian Portuguese', () => {
    for (const locale of ['en', 'pt-BR'] as const) {
      renderWithIntl(<SiteFooter />, locale);
      expect(screen.queryByRole('link', { name: 'Help improve the translation' })).toBeNull();
      cleanup();
    }
  });
});
