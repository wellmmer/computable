// @vitest-environment jsdom
import { cleanup, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithIntl } from '@/test/intl';
import { M4_HISTORY } from './m4-history';
import { M4History } from './M4History';

// The real Link needs the Next.js router, which screen tests do not have.
vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

afterEach(cleanup);

const section = () => screen.getByRole('region', { name: 'The M4 and the Bombes' });
const facts = () =>
  within(section())
    .getAllByRole('listitem')
    .filter((item) => item.querySelector('h3') !== null);

describe('M4History (spec R5a 4)', () => {
  it('tells the 4 facts in order, each with a date or a place in its title', () => {
    renderWithIntl(<M4History />);
    expect(
      within(section())
        .getAllByRole('heading', { level: 3 })
        .map(({ textContent }) => textContent),
    ).toEqual(['February 1942: the M4', '1942: about 10 months without U-boat messages', '1943: 4-rotor Bombes', 'The Bombe on this site']);
  });

  it('says the dates the sources state', () => {
    renderWithIntl(<M4History />);
    const text = section().textContent;
    expect(text).toContain('On 1 February 1942, the German navy put the 4-rotor M4 into use for U-boat messages.');
    expect(text).toContain('Bletchley Park could not read U-boat messages for about 10 months.');
    expect(text).toContain('30 October 1942');
    expect(text).toContain('December 1942');
    expect(text).toContain('The first US Navy Bombe was tested in May 1943.');
    expect(text).toContain('50 to 100 times as long');
  });

  it('links each fact to its sources', () => {
    renderWithIntl(<M4History />);
    expect(facts()).toHaveLength(M4_HISTORY.length);
    M4_HISTORY.forEach(({ id, sources }, i) => {
      const external = within(facts()[i])
        .getAllByRole('link')
        .map((link) => link.getAttribute('href'))
        .filter((href) => href?.startsWith('https://'));
      expect(external, id).toEqual(sources.map(({ url }) => url));
    });
  });

  it('says the Bombe on this site has 3 rotors, and links to it', () => {
    renderWithIntl(<M4History />);
    const here = facts()[3];
    expect(here.textContent).toContain('The Bombe on this site has 3 rotors, so it does not break M4 messages.');
    expect(within(here).getByRole('link', { name: 'Open the 3-rotor Bombe lab' }).getAttribute('href')).toBe('/bombe');
  });
});
