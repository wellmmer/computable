import { describe, expect, it } from 'vitest';
import en from '../../messages/en.json';
import { M4_HISTORY } from './m4-history';

describe('the M4 history (spec R5a 4)', () => {
  it('tells the 4 topics in order: the M4, the months without U-boat messages, the 4-rotor Bombes, the Bombe on this site', () => {
    expect(M4_HISTORY.map(({ id }) => id)).toEqual(['m4', 'blackout', 'bombes', 'here']);
  });

  it('links each fact to the pages that state it, checked on 2026-11-23', () => {
    expect(Object.fromEntries(M4_HISTORY.map(({ id, sources }) => [id, sources.map(({ url }) => url)]))).toEqual({
      m4: ['https://en.wikipedia.org/wiki/Enigma_machine'],
      blackout: ['https://en.wikipedia.org/wiki/German_submarine_U-559', 'https://en.wikipedia.org/wiki/Cryptanalysis_of_the_Enigma'],
      bombes: ['https://en.wikipedia.org/wiki/Bombe'],
      here: ['https://en.wikipedia.org/wiki/Cryptanalysis_of_the_Enigma'],
    });
  });

  it('gives every source a name and an https address', () => {
    for (const { name, url } of M4_HISTORY.flatMap(({ sources }) => sources)) {
      expect(name.trim(), url).not.toBe('');
      expect(new URL(url).protocol, url).toBe('https:');
    }
  });

  it('has a title and a text for each fact in the English texts', () => {
    for (const { id } of M4_HISTORY) {
      expect(en.enigma.history.facts[id].title, id).not.toBe('');
      expect(en.enigma.history.facts[id].text, id).not.toBe('');
    }
  });
});
