import { describe, expect, it } from 'vitest';
import en from '../../messages/en.json';
import { FILM_SOURCES, HISTORY } from './history';

const ALL_SOURCES = [...HISTORY.flatMap(({ sources }) => sources), ...FILM_SOURCES];

describe('the Bombe history (spec R4 5)', () => {
  it('tells the 5 topics in the order they happened', () => {
    expect(HISTORY.map(({ id }) => id)).toEqual(['bomba', 'pyry', 'turing', 'victory', 'welchman']);
  });

  it('links every fact and the film box to at least one published source', () => {
    for (const { id, sources } of HISTORY) expect(sources.length, id).toBeGreaterThan(0);
    expect(FILM_SOURCES.length).toBeGreaterThan(0);
  });

  it('gives every source a name and an https address', () => {
    for (const { name, url } of ALL_SOURCES) {
      expect(name.trim(), url).not.toBe('');
      expect(new URL(url).protocol, url).toBe('https:');
    }
  });

  it('has a title and a text for each fact in the English texts', () => {
    for (const { id } of HISTORY) {
      expect(en.bombe.history.facts[id].title, id).not.toBe('');
      expect(en.bombe.history.facts[id].text, id).not.toBe('');
    }
  });
});
