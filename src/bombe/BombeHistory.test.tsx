// @vitest-environment jsdom
import { cleanup, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { renderWithIntl } from '@/test/intl';
import { BombeHistory } from './BombeHistory';
import { FILM_SOURCES, HISTORY } from './history';

afterEach(cleanup);

const section = () => screen.getByRole('region', { name: 'How the Bombe came to be' });

describe('BombeHistory (spec R4 5)', () => {
  it('tells the 5 facts in the order they happened, each with a date in its title', () => {
    renderWithIntl(<BombeHistory />);
    const titles = within(section())
      .getAllByRole('heading', { level: 3 })
      .map(({ textContent }) => textContent);
    expect(titles).toEqual([
      '1938: the Polish bomba',
      'July 1939: the meeting at Pyry',
      '1939: Turing’s Bombe',
      'March 1940: Victory',
      'August 1940: Welchman’s diagonal board',
      'On film',
    ]);
  });

  it('links each fact to its sources', () => {
    renderWithIntl(<BombeHistory />);
    const facts = within(section()).getAllByRole('listitem').filter((item) => item.querySelector('h3') !== null);
    expect(facts).toHaveLength(HISTORY.length);
    HISTORY.forEach(({ id, sources }, i) => {
      const links = within(facts[i]).getAllByRole('link');
      expect(
        links.map((link) => link.getAttribute('href')),
        id,
      ).toEqual(sources.map(({ url }) => url));
    });
  });

  it('shows the film box with text and links only: no picture', () => {
    renderWithIntl(<BombeHistory />);
    const film = screen.getByRole('heading', { level: 3, name: 'On film' }).parentElement;
    if (film === null) throw new Error('The film box has no parent.');
    expect(film.textContent).toContain('The Imitation Game (2014), a drama with Benedict Cumberbatch as Alan Turing.');
    expect(film.textContent).toContain('The film calls the machine “Christopher”, but the first real Bombe was called Victory.');
    expect(
      within(film)
        .getAllByRole('link')
        .map((link) => link.getAttribute('href')),
    ).toEqual(FILM_SOURCES.map(({ url }) => url));
    expect(section().querySelector('img, picture, video, svg')).toBeNull();
  });
});
