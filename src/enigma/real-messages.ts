import type { EnigmaSettings, M4Settings, Positions } from '@/engines/enigma';
import type { KeySheet } from './key-sheet';

export interface RealMessagePart extends KeySheet {
  /** How the operator sent the start: from the windows `from`, the letters `typed` light the start. Null for the navy, which used tables. */
  hiddenStart: { from: Positions; typed: string } | null;
  /** The first group or groups. They only named the key, so they are not typed and not in `cipher`. Null when the source left them out. */
  keyGroup: string | null;
  /** The plain text exactly as the sources print it. */
  published: string;
}

export interface RealMessage {
  id: 'barbarossa' | 'u264' | 'scharnhorst';
  /** The day the message was sent, or only the month when the sources do not agree on the day. */
  date: string;
  parts: readonly RealMessagePart[];
  /** The German text with spaces, capitals and the short forms written out. Our own reading of the sources. */
  readable: string;
  /** Where every setting and letter comes from. Checked letter by letter on 2026-11-20. */
  sources: readonly { name: string; url: string }[];
}

/** 7 July 1941, the key of the day: Walzenlage II IV V, Ringstellung 02 21 12 (B U L), 10 plug pairs, reflector B. */
const BARBAROSSA: EnigmaSettings = {
  rotors: ['II', 'IV', 'V'],
  rings: ['B', 'U', 'L'],
  reflector: 'B',
  plugs: ['AV', 'BS', 'CG', 'DL', 'FU', 'HZ', 'IN', 'KM', 'OW', 'RX'],
};

/**
 * November 1942, naval Enigma M4: the key the M4 Project found in 2006. The M4 Project page says 25
 * November, but the signal time points to the 19th, so the page says only "November 1942". Other
 * ring and start pairs give the same text, so these rings are not known to be the real ones.
 */
const U264: M4Settings = {
  model: 'M4',
  thinRotor: 'Beta',
  thinRing: 'A',
  thinPosition: 'V',
  rotors: ['II', 'IV', 'I'],
  rings: ['A', 'A', 'V'],
  reflector: 'B',
  plugs: ['AT', 'BL', 'DF', 'GJ', 'HM', 'NW', 'OP', 'QY', 'RZ', 'VX'],
};

/** 26 December 1943, naval Enigma M3: wheel order 368, rings A H M, 10 plug pairs, reflector B. */
const SCHARNHORST: EnigmaSettings = {
  rotors: ['III', 'VI', 'VIII'],
  rings: ['A', 'H', 'M'],
  reflector: 'B',
  plugs: ['AN', 'EZ', 'HK', 'IJ', 'LR', 'MQ', 'OT', 'PV', 'SW', 'UX'],
};

/**
 * The real messages (spec R3 4, and U-264 from spec R5a 4), in the order they were sent. The settings, the secret letters and the plain texts come from
 * the sources below, and src/enigma/real-messages.test.ts decrypts each part with the engine.
 */
export const REAL_MESSAGES: readonly RealMessage[] = [
  {
    id: 'barbarossa',
    date: '1941-07-07',
    parts: [
      {
        settings: BARBAROSSA,
        start: ['B', 'L', 'A'],
        hiddenStart: { from: ['W', 'X', 'C'], typed: 'KCH' },
        keyGroup: 'RFUGZ',
        cipher:
          'EDPUD NRGYS ZRCXN UYTPO MRMBO FKTBZ REZKM LXLVE FGUEY SIOZV EQMIK UBPMM YLKLT TDEIS MDICA GYKUA CTCDO MOHWX MUUIA UBSTS LRNBZ SZWNR FXWFY SSXJZ VIJHI DISHP RKLKA YUPAD TXQSP INQMA TLPIF SVKDA SCTAC DPBOP VHJK',
        answer:
          'AUFKLXABTEILUNGXVONXKURTINOWAXKURTINOWAXNORDWESTLXSEBEZXSEBEZXUAFFLIEGERSTRASZERIQTUNGXDUBROWKIXDUBROWKIXOPOTSCHKAXOPOTSCHKAXUMXEINSAQTDREINULLXUHRANGETRETENXANGRIFFXINFXRGTX',
        published:
          'AUFKL XABTE ILUNG XVONX KURTI NOWAX KURTI NOWAX NORDW ESTLX SEBEZ XSEBE ZXUAF FLIEG ERSTR ASZER IQTUN GXDUB ROWKI XDUBR OWKIX OPOTS CHKAX OPOTS CHKAX UMXEI NSAQT DREIN ULLXU HRANG ETRET ENXAN GRIFF XINFX RGTX',
      },
      {
        settings: BARBAROSSA,
        start: ['L', 'S', 'D'],
        hiddenStart: { from: ['C', 'R', 'S'], typed: 'YPJ' },
        keyGroup: 'FNJAU',
        cipher:
          'SFBWD NJUSE GQOBH KRTAR EEZMW KPPRB XOHDR OEQGB BGTQV PGVKB VVGBI MHUSZ YDAJQ IROAX SSSNR EHYGG RPISE ZBOVM QIEMM ZCYSG QDGRE RVBIL EKXYQ IRGIR QNRDN VRXCY YTNJR SBDPJ BFFKY QWFUS',
        answer:
          'DREIGEHTLANGSAMABERSIQERVORWAERTSXEINSSIEBENNULLSEQSXUHRXROEMXEINSXINFRGTXDREIXAUFFLIEGERSTRASZEMITANFANGXEINSSEQSXKMXKMXOSTWXKAMENECXKAMENECXDIVXKDRX',
        published:
          'DREIG EHTLA NGSAM ABERS IQERV ORWAE RTSXE INSSI EBENN ULLSE QSXUH RXROE MXEIN SXINF RGTXD REIXA UFFLI EGERS TRASZ EMITA NFANG XEINS SEQSX KMXKM XOSTW XKAME NECXK AMENE CXDIV XKDRX',
      },
    ],
    readable:
      'Aufklärungsabteilung von Kurtinowa nordwestlich Sebez auf Fliegerstraße Richtung Dubrowki, Opotschka. Um 18:30 Uhr angetreten. Angriff Inf.-Rgt. 3 geht langsam, aber sicher vorwärts. 17:06 Uhr: I./Inf.-Rgt. 3 auf Fliegerstraße mit Anfang 16 km ostwärts Kamenec. Div.-Kdr.',
    sources: [
      { name: 'Wikipedia (es): Enigma (máquina), “Ejemplo de cifrado”', url: 'https://es.wikipedia.org/wiki/Enigma_(m%C3%A1quina)#Ejemplo_de_cifrado' },
      {
        name: 'Dirk Rijmenants: Enigma Sim Manual (PDF), “Authentic Wartime Message from the Russian Front”',
        url: 'https://www.ciphermachinesandcryptology.com/files/Enigma%20Sim%20Manual.pdf',
      },
      { name: 'Frode Weierud, CryptoCellar: Enigma keys for July 1941', url: 'https://cryptocellar.org/bgac/e-keys-july-1941.html' },
      { name: 'Frode Weierud, CryptoCellar: 1941 Message Overview', url: 'https://cryptocellar.org/bgac/1941-msg-list.html' },
    ],
  },
  {
    id: 'u264',
    date: '1942-11',
    parts: [
      {
        settings: U264,
        start: ['J', 'N', 'A'],
        hiddenStart: null,
        keyGroup: null,
        cipher:
          'NCZW VUSX PNYM INHZ XMQX SFWX WLKJ AHSH NMCO CCAK UQPM KCSM HKSE INJU SBLK IOSX CKUB HMLL XCSJ USRR DVKO HULX WCCB GVLI YXEO AHXR HKKF VDRE WEZL XOBA FGYU JQUK GRTV UKAM EURB VEKS UHHV OYHA BCJW MAKL FKLM YFVN RIZR VVRT KOFD ANJM OLBG FFLE OPRG TFLV RHOW OPBE KVWM UQFM PWPA RMFH AGKX IIBG',
        answer:
          'VONVONJLOOKSJHFFTTTEINSEINSDREIZWOYYQNNSNEUNINHALTXXBEIANGRIFFUNTERWASSERGEDRUECKTYWABOSXLETZTERGEGNERSTANDNULACHTDREINULUHRMARQUANTONJOTANEUNACHTSEYHSDREIYZWOZWONULGRADYACHTSMYSTOSSENACHXEKNSVIERMBFAELLTYNNNNNNOOOVIERYSICHTEINSNULL',
        published:
          'vonvonjlooksjhffttteinseinsdreizwoyyqnnsneuninhaltxxbeiangriffunterwassergedruecktywabosxletztergegnerstandnulachtdreinuluhrmarquantonjotaneunachtseyhsdreiyzwozwonulgradyachtsmystossenachxeknsviermbfaelltynnnnnnooovierysichteinsnull',
      },
    ],
    readable:
      'Von Looks: Funktelegramm 1132/19. Inhalt: Bei Angriff unter Wasser gedrückt, Wasserbomben. Letzter Gegnerstandort 08:30 Uhr, Marqu AJ 9863, 220 Grad, 8 Seemeilen, stoße nach. 14 Millibar fällt, NNO 4, Sicht 10.',
    sources: [
      { name: 'Stefan Krah, M4 Project: “The M4 Project”', url: 'https://www.bytereef.org/m4_project.html' },
      { name: 'Stefan Krah, M4 Project: “First break, interpretation and translation”', url: 'https://www.bytereef.org/m4-project-first-break.html' },
      { name: 'uboat.net: U-264', url: 'https://uboat.net/boats/u264.htm' },
    ],
  },
  {
    id: 'scharnhorst',
    date: '1943-12-26',
    parts: [
      {
        settings: SCHARNHORST,
        start: ['U', 'Z', 'V'],
        hiddenStart: null,
        keyGroup: 'UTKZ RBSB',
        cipher: 'YKAE NZAP MSCH ZBFO CUVM RMDP YCOF HADZ IZME FXTH FLOL PZLF GGBO TGOX GRET DWTJ IQHL MXVJ WKZU ASTR',
        answer: 'STEUEREJTANAFJORDJANSTANDORTQUAAACCCVIERNEUNNEUNZWOFAHRTZWONULSMXXSCHARNHORSTHCO',
        published: 'steuere j tanafjord j an standort qu aaa ccc vier neun neun zwo fahrt zwo nul sm xx scharnhorst hco',
      },
    ],
    readable: 'Steuere Tanafjord an. Standort Qu. AC 4992, Fahrt 20 sm. Scharnhorst',
    sources: [
      { name: 'Frode Weierud, CryptoCellar: “Scharnhorst’s Last Message?”', url: 'https://cryptocellar.org/bgac/scharnhorst.html' },
      { name: 'Stefan Krah, M4 Project: “Break of the Scharnhorst message”', url: 'https://www.bytereef.org/m4-project-scharnhorst-break.html' },
    ],
  },
];
