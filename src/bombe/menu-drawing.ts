import type { Menu } from '@/engines/bombe';
import type { Letter } from '@/engines/enigma';

/** The drawing is a square of this size, in SVG units. */
export const DRAWING_SIZE = 240;

const MIDDLE = DRAWING_SIZE / 2;
const RING = 92;
/** How far apart 2 links between the same letters bend. */
const BEND = 18;

export interface MenuDrawing {
  /** Each letter, with its place. The center letter sits in the middle; the others sit on a ring. */
  letters: readonly { letter: Letter; x: number; y: number; center: boolean }[];
  /** An SVG path for each link. Links between the same 2 letters bend apart, so each one shows. */
  lines: readonly { key: string; path: string }[];
}

const round = (value: number) => Math.round(value * 10) / 10;

/** Where each letter and link of the menu goes. A link from a letter to itself (a crash) has no line. */
export function drawMenu(menu: Menu): MenuDrawing {
  if (menu.center === null) return { letters: [], lines: [] };
  const others = menu.letters.filter((letter) => letter !== menu.center);
  const places = new Map<Letter, { x: number; y: number }>([[menu.center, { x: MIDDLE, y: MIDDLE }]]);
  others.forEach((letter, i) => {
    // The first letter sits at the top; the others follow clockwise.
    const angle = (2 * Math.PI * i) / others.length - Math.PI / 2;
    places.set(letter, { x: round(MIDDLE + RING * Math.cos(angle)), y: round(MIDDLE + RING * Math.sin(angle)) });
  });

  const place = (letter: Letter) => places.get(letter) ?? { x: MIDDLE, y: MIDDLE };

  // Links between the same 2 letters, in either direction, share one entry.
  const pairs = new Map<string, { a: Letter; b: Letter; count: number }>();
  for (const { plain, cipher } of menu.links) {
    const [a, b] = plain < cipher ? [plain, cipher] : [cipher, plain];
    const pair = pairs.get(a + b) ?? { a, b, count: 0 };
    pairs.set(a + b, { ...pair, count: pair.count + 1 });
  }
  const lines: { key: string; path: string }[] = [];
  for (const { a, b, count } of pairs.values()) {
    if (a === b) continue;
    const [from, to] = [place(a), place(b)];
    for (let i = 0; i < count; i++) {
      const bend = (i - (count - 1) / 2) * BEND;
      const key = `${a}${b}${i}`;
      if (bend === 0) {
        lines.push({ key, path: `M${from.x} ${from.y}L${to.x} ${to.y}` });
        continue;
      }
      // A curve through a point beside the middle of the line, at right angles to it.
      const [dx, dy] = [to.x - from.x, to.y - from.y];
      const length = Math.hypot(dx, dy);
      const control = { x: round((from.x + to.x) / 2 - (dy / length) * bend * 2), y: round((from.y + to.y) / 2 + (dx / length) * bend * 2) };
      lines.push({ key, path: `M${from.x} ${from.y}Q${control.x} ${control.y} ${to.x} ${to.y}` });
    }
  }

  return {
    letters: menu.letters.map((letter) => ({ letter, ...place(letter), center: letter === menu.center })),
    lines,
  };
}
