import type { EnigmaSettings, M4Settings, Positions } from '@/engines/enigma';
import type { Locale } from 'next-intl';
import type { KeySheet } from './key-sheet';

/** Practice 1: no plug pairs. */
const NO_PLUGS: EnigmaSettings = { rotors: ['I', 'II', 'III'], rings: ['A', 'A', 'A'], reflector: 'B', plugs: [] };
/** Practice 2: the same rotors, with 4 plug pairs. */
const PLUGS: EnigmaSettings = { ...NO_PLUGS, plugs: ['AT', 'BL', 'EN', 'GR'] };
/** Practice 3: the same plug pairs, with ring settings. */
const PLUGS_AND_RINGS: EnigmaSettings = { ...PLUGS, rings: ['F', 'U', 'N'] };

/** The settings and start of each practice message, the same in every language. */
const SHEETS: readonly { settings: EnigmaSettings; start: Positions }[] = [
  { settings: NO_PLUGS, start: ['A', 'A', 'A'] },
  { settings: PLUGS, start: ['D', 'O', 'G'] },
  { settings: PLUGS_AND_RINGS, start: ['Z', 'O', 'O'] },
];

/**
 * The plain texts and secret letters in each language: 26 letters, no accents, X between words. The
 * secret letters come from the engine; src/enigma/practice-messages.test.ts checks every one.
 */
const TEXTS: Record<Locale, readonly [answer: string, cipher: string][]> = {
  en: [
    ['HELLOXFROMXBLETCHLEYXPARK', 'ILBDA SDTMV HFEBU AWAOM QEQGT'],
    ['TURINGXHELPEDXBREAKXENIGMA', 'OBTVW FDFZZ ZZOCV SJEYG BLJDZ C'],
    ['AXLETTERXNEVERXBECOMESXITSELF', 'XMIWI PCLAI MUPHV NBXSL NFBES KQMR'],
  ],
  'pt-BR': [
    ['OLAXDEXBLETCHLEYXPARK', 'TEZPI NYIAC MKGYS QQKPV S'],
    ['TURINGXAJUDOUXAXQUEBRARXAXENIGMA', 'OBTVW FDRQB UVXCL GYRQS OZUNI SNEHF ZT'],
    ['NENHUMAXLETRAXVIRAXELAXMESMA', 'OWGKH HZFTF YLIBX TADUT GXBZF KHJ'],
  ],
  es: [
    ['HOLAXDESDEXBLETCHLEYXPARK', 'IIBGT VKFRC HFEBU AWAOM QEQGT'],
    ['TURINGXAYUDOXAXROMPERXENIGMA', 'OBTVW FDRBB UVUUT SZHWM OCYXA HAG'],
    ['UNAXLETRAXNUNCAXSEXCIFRAXCOMOXSIXMISMA', 'MKWTB XRLXK PVWVJ VPMUY HSHNN FZLMR GOKLZ BTZ'],
  ],
  fr: [
    ['BONJOURXDEXBLETCHLEYXPARK', 'AIOZA PNARC HFEBU AWAOM QEQGT'],
    ['TURINGXAXAIDEXAXCASSERXENIGMA', 'OBTVW FDRFG EBBCL GDEBB BVQPB TXTG'],
    ['UNEXLETTREXNEXDEVIENTXJAMAISXELLEXMEME', 'MKPTB XRCDF KPPBQ CTJWZ QAYNW IWIKT ICMTG KTB'],
  ],
  de: [
    ['HALLOXAUSXBLETCHLEYXPARK', 'IDBDA SCDKR IRLAY GBZNU RUKY'],
    ['TURINGXHALFXENIGMAXZUXKNACKEN', 'OBTVW FDFSZ HRBGO XKEDL DCMXI ADNK'],
    ['KEINXBUCHSTABEXWIRDXZUXSICHXSELBST', 'WWLLJ AJTMV YFLSV ZCKQV VBBQG FMPBT IACX'],
  ],
};

/** Practice 4 (spec R5a 3): the naval M4, with thin rotor Gamma at U and thin reflector C. */
const M4_SHEET: { settings: M4Settings; start: Positions } = {
  settings: {
    model: 'M4',
    thinRotor: 'Gamma',
    thinRing: 'A',
    thinPosition: 'U',
    rotors: ['II', 'IV', 'VIII'],
    rings: ['A', 'A', 'A'],
    reflector: 'C',
    plugs: ['AT', 'BL', 'EN', 'GR'],
  },
  start: ['N', 'A', 'V'],
};

/** Practice 4's plain text and secret letters in each language. src/enigma/practice-messages.test.ts checks them. */
const M4_TEXTS: Record<Locale, readonly [answer: string, cipher: string]> = {
  en: ['FOURXROTORSXFORXTHEXNAVY', 'BVPNO JHKGP VCRSK EWZWT XWXQ'],
  'pt-BR': ['QUATROXROTORESXPARAXAXMARINHA', 'PNNMT GAFGS RIJOG VPSOT WKHOK ZTOK'],
  es: ['CUATROXROTORESXPARAXLAXARMADA', 'RNNMT GAFGS RIJOG VPSOT PWVOK SPFK'],
  fr: ['QUATREXROTORSXPOURXLAXMARINE', 'PNNMT PAFGS RIMWY SRSUS WKHOK ZTP'],
  de: ['VIERXWALZENXFUERXDIEXMARINE', 'IPXNO XXVSI ECRMH FIOJW NCNBS BV'],
};

/** The 3 practice messages in the visitor's language (spec R3 4), each harder than the last. */
export function practiceMessages(locale: Locale): KeySheet[] {
  return SHEETS.map((sheet, i) => {
    const [answer, cipher] = TEXTS[locale][i];
    return { ...sheet, answer, cipher };
  });
}

/** "HELLOXFROM" → "HELLO FROM": X stands for a space in Enigma messages. */
export function readable(answer: string): string {
  return answer.replaceAll('X', ' ');
}

/** Practice 4, the naval M4, in the visitor's language (spec R5a 3). */
export function practiceM4Message(locale: Locale): KeySheet {
  const [answer, cipher] = M4_TEXTS[locale];
  return { ...M4_SHEET, answer, cipher };
}
