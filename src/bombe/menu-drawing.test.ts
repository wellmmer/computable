import { describe, expect, it } from 'vitest';
import { buildMenu } from '@/engines/bombe';
import { DRAWING_SIZE, drawMenu } from './menu-drawing';
import { PRACTICE } from './practice-message';

describe('drawMenu (spec R4 3, "Menu card")', () => {
  const menu = buildMenu(PRACTICE.cipher, PRACTICE.crib, 0);
  const drawing = drawMenu(menu);

  it('puts the center letter in the middle and the others on a ring, the first at the top', () => {
    const center = drawing.letters.find((letter) => letter.center);
    expect(center).toEqual({ letter: menu.center, x: DRAWING_SIZE / 2, y: DRAWING_SIZE / 2, center: true });
    const others = drawing.letters.filter((letter) => !letter.center);
    expect(others).toHaveLength(menu.letters.length - 1);
    expect(others[0]).toMatchObject({ x: 120, y: 28 });
    for (const { x, y } of others) expect(Math.round(Math.hypot(x - 120, y - 120))).toBe(92);
  });

  it('draws one line for each link', () => {
    expect(drawing.lines).toHaveLength(menu.links.length);
    expect(drawing.lines[0]).toEqual({ key: 'HW0', path: expect.stringMatching(/^M[\d.]+ [\d.]+L[\d.]+ [\d.]+$/) });
  });

  it('bends 2 links between the same letters apart, so both show', () => {
    // E sits on G twice in this menu (spec R4 2 test message).
    const twice = drawMenu(buildMenu('TRZMGWVGMWMQR', 'WETTERBERICHT', 0)).lines.filter(({ key }) => key.startsWith('EG'));
    expect(twice).toHaveLength(2);
    expect(twice.every(({ path }) => path.includes('Q'))).toBe(true);
    expect(twice[0].path).not.toBe(twice[1].path);
  });

  it('draws nothing for a menu without links', () => {
    expect(drawMenu(buildMenu('ABC', '', 0))).toEqual({ letters: [], lines: [] });
  });
});
