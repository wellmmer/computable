import { isLetter, type Letter } from '@/engines/enigma';

/** One crib letter on top of its secret letter. The Bombe tests it with one Enigma. */
export interface MenuLink {
  plain: Letter;
  cipher: Letter;
  /** The place in the message, from 0. The rotors turn `position + 1` times before this letter. */
  position: number;
}

/** The letter links a crib makes at one place in the secret letters. */
export interface Menu {
  links: readonly MenuLink[];
  /** Every letter in a link, in alphabetical order. */
  letters: readonly Letter[];
  /** How many loops the links close. Each loop removes most false stops. */
  loops: number;
  /** The letter with the most links. The test starts here. Null when there are no links. */
  center: Letter | null;
}

/** The places in the message where a crib letter sits on the same secret letter. */
export function crashes(cipher: string, crib: string, offset: number): number[] {
  const places: number[] = [];
  for (let i = 0; i < crib.length; i++) {
    if (crib[i] === cipher[offset + i]) places.push(offset + i);
  }
  return places;
}

/**
 * The menu of `crib` laid on `cipher` from the place `offset`. Letters outside A to Z, and crib
 * letters past the end of the message, make no link.
 */
export function buildMenu(cipher: string, crib: string, offset: number): Menu {
  const links: MenuLink[] = [];
  for (let i = 0; i < crib.length; i++) {
    const plain = crib[i];
    const secret = cipher[offset + i];
    if (secret !== undefined && isLetter(plain) && isLetter(secret)) links.push({ plain, cipher: secret, position: offset + i });
  }

  const counts = new Map<Letter, number>();
  for (const { plain, cipher: secret } of links) {
    counts.set(plain, (counts.get(plain) ?? 0) + 1);
    counts.set(secret, (counts.get(secret) ?? 0) + 1);
  }
  const letters = [...counts.keys()].sort();
  // Ties go to the first letter in the alphabet, so the same crib always gives the same center.
  const center = letters.reduce<Letter | null>((best, letter) => (best === null || counts.get(letter)! > counts.get(best)! ? letter : best), null);

  return { links, letters, loops: links.length - letters.length + groups(letters, links), center };
}

/** How many separate groups of linked letters the menu has. */
function groups(letters: readonly Letter[], links: readonly MenuLink[]): number {
  const parent = new Map<Letter, Letter>(letters.map((letter) => [letter, letter]));
  const root = (letter: Letter): Letter => {
    let at = letter;
    while (parent.get(at) !== at) at = parent.get(at)!;
    return at;
  };
  let count = letters.length;
  for (const { plain, cipher } of links) {
    const [a, b] = [root(plain), root(cipher)];
    if (a !== b) {
      parent.set(a, b);
      count--;
    }
  }
  return count;
}
