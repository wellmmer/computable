/**
 * The parts of Turing's paper that the reading guide follows (spec R2c 3), the same in every
 * language. Translators never edit this file: the texts live in <language>.json.
 *
 * Pages are in the Proceedings of the London Mathematical Society, series 2. Volume 42 holds the
 * paper (pages 230–265); every range and quote below was checked on a scan of those pages. Volume
 * 43 holds the correction; its pages come from the publisher's page, not from a scan.
 */
export interface PaperPart {
  id: string;
  volume: 42 | 43;
  /** The first and the last page of the part. A part may start or end in the middle of a page. */
  pages: readonly [number, number];
  /** One short quote in Turing's English, word for word, and its page; null for no quote. */
  quote: { page: number; text: string } | null;
  /** The lessons that explain this part, by slug. */
  lessons: readonly string[];
  /** A link to the part itself, for a part this guide does not summarise. */
  link?: string;
}

export const PAPER_PARTS: readonly PaperPart[] = [
  {
    id: 'section-1',
    volume: 42,
    pages: [231, 232],
    quote: {
      page: 231,
      text: 'The machine is supplied with a “tape” (the analogue of paper) running through it, and divided into sections (called “squares”) each capable of bearing a “symbol”.',
    },
    lessons: ['intuition'],
  },
  {
    id: 'section-2',
    volume: 42,
    pages: [232, 233],
    quote: { page: 233, text: 'A sequence is said to be computable if it can be computed by a circle-free machine.' },
    lessons: ['intuition', 'halting-problem', 'church-turing'],
  },
  {
    id: 'section-3',
    volume: 42,
    pages: [233, 235],
    quote: { page: 233, text: 'A machine can be constructed to compute the sequence 010101….' },
    lessons: ['intuition', 'formal-definition'],
  },
  {
    id: 'section-4',
    volume: 42,
    pages: [235, 239],
    quote: {
      page: 235,
      text: 'These processes include copying down sequences of symbols, comparing sequences, erasing all symbols of a given form, etc.',
    },
    lessons: [],
  },
  {
    id: 'section-5',
    volume: 42,
    pages: [239, 241],
    quote: { page: 241, text: 'The computable sequences and numbers are therefore enumerable.' },
    lessons: ['universal-machine'],
  },
  {
    id: 'section-6',
    volume: 42,
    pages: [241, 243],
    quote: { page: 241, text: 'It is possible to invent a single machine which can be used to compute any computable sequence.' },
    lessons: ['universal-machine'],
  },
  {
    id: 'section-7',
    volume: 42,
    pages: [243, 246],
    quote: { page: 243, text: 'The S.D consists of a number of instructions, separated by semi-colons.' },
    lessons: ['universal-machine'],
  },
  {
    id: 'section-8',
    volume: 42,
    pages: [246, 248],
    quote: {
      page: 246,
      text: 'In fact, by applying the diagonal process argument correctly, we can show that there cannot be any such general process.',
    },
    lessons: ['halting-problem', 'entscheidungsproblem'],
  },
  {
    id: 'section-9',
    volume: 42,
    pages: [249, 254],
    quote: { page: 249, text: 'The real question at issue is “What are the possible processes which can be carried out in computing a number?”' },
    lessons: ['intuition', 'church-turing'],
  },
  {
    id: 'section-10',
    volume: 42,
    pages: [254, 258],
    quote: { page: 254, text: 'There are many equivalent ways of defining a computable function of an integral variable.' },
    lessons: [],
  },
  {
    id: 'section-11',
    volume: 42,
    pages: [259, 263],
    quote: { page: 262, text: 'Hence the Entscheidungsproblem cannot be solved.' },
    lessons: ['entscheidungsproblem'],
  },
  {
    id: 'appendix',
    volume: 42,
    pages: [263, 265],
    quote: {
      page: 263,
      text: 'The theorem that all effectively calculable (λ-definable) sequences are computable and its converse are proved below in outline.',
    },
    lessons: ['church-turing'],
  },
  {
    id: 'correction',
    volume: 43,
    pages: [544, 546],
    quote: null,
    lessons: [],
    link: 'https://doi.org/10.1112/plms/s2-43.6.544',
  },
];
