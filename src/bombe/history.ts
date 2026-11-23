/** A published page that a fact links to. */
export interface Source {
  name: string;
  url: string;
}

/** One fact of the history under the Bombe lab. Its title and text are in `bombe.history.facts.<id>`. */
export interface HistoryFact {
  id: 'bomba' | 'pyry' | 'turing' | 'victory' | 'welchman';
  sources: readonly Source[];
}

const CRYPTO_MUSEUM_BOMBE: Source = { name: 'Crypto Museum: Turing Bombe', url: 'https://www.cryptomuseum.com/crypto/bombe/' };

/**
 * The history under the Bombe lab (spec R4 5), in the order it happened. Every date was checked
 * against these sources on 2026-11-23. Where they differ, the text says so.
 */
export const HISTORY: readonly HistoryFact[] = [
  {
    id: 'bomba',
    sources: [
      { name: 'Crypto Museum: Turing Bombe, “The Polish Bomba 1938”', url: 'https://www.cryptomuseum.com/crypto/bombe/#bomba' },
      { name: 'Wikipedia: Bomba (cryptography)', url: 'https://en.wikipedia.org/wiki/Bomba_(cryptography)' },
    ],
  },
  {
    id: 'pyry',
    sources: [
      { name: 'GCHQ: The Pyry Forest meeting', url: 'https://www.gchq.gov.uk/information/the-pyry-forest-meeting' },
      { name: 'Crypto Museum: Polish Enigma', url: 'https://www.cryptomuseum.com/crypto/enigma/polish/' },
    ],
  },
  {
    id: 'turing',
    sources: [
      CRYPTO_MUSEUM_BOMBE,
      { name: 'The Alan Turing Internet Scrapbook: the Enigma report of 1 November 1939', url: 'https://turing.org.uk/sources/nov39.html' },
    ],
  },
  {
    id: 'victory',
    sources: [
      { name: 'The National Museum of Computing: the Turing-Welchman Bombe', url: 'https://tnmoc.org/bombe' },
      CRYPTO_MUSEUM_BOMBE,
    ],
  },
  {
    id: 'welchman',
    sources: [CRYPTO_MUSEUM_BOMBE, { name: 'The National Museum of Computing: the Turing-Welchman Bombe', url: 'https://tnmoc.org/bombe' }],
  },
];

/** What the film changes, checked on 2026-11-23. */
export const FILM_SOURCES: readonly Source[] = [
  {
    name: 'Slate, L.V. Anderson, 3 December 2014: “How Accurate Is The Imitation Game?”',
    url: 'https://slate.com/culture/2014/12/the-imitation-game-fact-vs-fiction-how-true-the-new-movie-is-to-alan-turings-real-life-story.html',
  },
  { name: 'TIME, Eliana Dockterman, 28 November 2014: “The True Story of The Imitation Game”', url: 'https://time.com/3609585/the-true-story-of-the-imitation-game/' },
];
