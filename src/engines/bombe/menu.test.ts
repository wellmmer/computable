import { describe, expect, it } from 'vitest';
import { buildMenu, crashes } from './menu';

/** WETTERBERICHT typed on the lab's first settings lights these letters (spec R3 3). */
const LAB_CIPHER = 'PBJGOLIZQMQGZ';

describe('buildMenu (spec R4 2, "Menu")', () => {
  it('links each crib letter to its secret letter, and finds the loops and the center letter', () => {
    const menu = buildMenu('TRZMGWVGMWMQR', 'WETTERBERICHT', 0);
    expect(menu.links.map(({ plain, cipher, position }) => `${plain}${cipher}${position}`)).toEqual([
      'WT0', 'ER1', 'TZ2', 'TM3', 'EG4', 'RW5', 'BV6', 'EG7', 'RM8', 'IW9', 'CM10', 'HQ11', 'TR12',
    ]);
    expect(menu.letters.join('')).toBe('BCEGHIMQRTVWZ');
    // 13 links, 13 letters, 3 separate groups (B–V, H–Q and the rest): 13 − 13 + 3 = 3 loops.
    expect(menu.loops).toBe(3);
    // R and T both have 4 links. The tie goes to the first letter in the alphabet.
    expect(menu.center).toBe('R');
  });

  it('counts the place in the message from the offset', () => {
    const menu = buildMenu(`XX${LAB_CIPHER}`, 'WETTERBERICHT', 2);
    expect(menu.links[0]).toEqual({ plain: 'W', cipher: 'P', position: 2 });
    expect(menu.links.at(-1)).toEqual({ plain: 'T', cipher: 'Z', position: 14 });
  });

  it('makes no link for crib letters past the end of the message', () => {
    expect(buildMenu('ABC', 'XYZW', 1).links.map(({ position }) => position)).toEqual([1, 2]);
  });

  it('has no center and no loops without a crib', () => {
    expect(buildMenu(LAB_CIPHER, '', 0)).toEqual({ links: [], letters: [], loops: 0, center: null });
  });
});

describe('crashes (spec R4 2, "Crashes")', () => {
  it('lists the places where a crib letter sits on the same secret letter', () => {
    expect(crashes('QWERTY', 'XWEZ', 0)).toEqual([1, 2]);
    expect(crashes('QWERTY', 'RT', 3)).toEqual([3, 4]);
  });

  it('finds none where WETTERBERICHT really sits', () => {
    expect(crashes(LAB_CIPHER, 'WETTERBERICHT', 0)).toEqual([]);
  });
});
