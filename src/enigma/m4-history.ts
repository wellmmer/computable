/** One fact of the history under the Enigma lab. Its title and text are in `enigma.history.facts.<id>`. */
export interface M4HistoryFact {
  id: 'm4' | 'blackout' | 'bombes' | 'here';
  /** The published pages that state the fact. */
  sources: readonly { name: string; url: string }[];
}

const CRYPTANALYSIS = { name: 'Wikipedia: Cryptanalysis of the Enigma', url: 'https://en.wikipedia.org/wiki/Cryptanalysis_of_the_Enigma' };

/**
 * The history of the M4 under the Enigma lab (spec R5a 4), in the order it happened. Every fact
 * was checked against these pages on 2026-11-23.
 */
export const M4_HISTORY: readonly M4HistoryFact[] = [
  // "A four-rotor Enigma was introduced by the Navy for U-boat traffic on 1 February 1942."
  { id: 'm4', sources: [{ name: 'Wikipedia: Enigma machine', url: 'https://en.wikipedia.org/wiki/Enigma_machine' }] },
  // U-559: sunk on 30 October 1942, ten months without the U-boat Enigma, the codebooks "immensely valuable".
  // Cryptanalysis: "Regular deciphering of U-boat traffic restarted in December 1942."
  {
    id: 'blackout',
    sources: [{ name: 'Wikipedia: German submarine U-559', url: 'https://en.wikipedia.org/wiki/German_submarine_U-559' }, CRYPTANALYSIS],
  },
  // Mammoth "was designed by Harold Keen at BTM". NCR in Dayton, led by Joseph Desch. "tested on 3 May 1943".
  { id: 'bombes', sources: [{ name: 'Wikipedia: Bombe', url: 'https://en.wikipedia.org/wiki/Bombe' }] },
  // "Solving Shark keys on 3-rotor bombes would have taken 50 to 100 times as long as an average Air Force or Army job."
  { id: 'here', sources: [CRYPTANALYSIS] },
];
