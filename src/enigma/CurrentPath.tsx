'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { isM4, type Letter, type MachineSettings, type PathPoint } from '@/engines/enigma';
import type { TypedLetter } from './lab-state';

/** Out to the reflector, or back from it. */
type Lane = 'out' | 'back';

/**
 * Where the parts sit: column 0 is the key and lamp, 1 the plugboard, 2 to 4 the rotors, and the last
 * column the reflector. The M4 puts its thin rotor in column 5 and the reflector in column 6.
 */
interface Layout {
  viewBox: string;
  /** The center of a letter circle. */
  at: (column: number, lane: Lane) => { x: number; y: number };
  box: (column: number) => { x: number; y: number; width: number; height: number };
  label: (column: number) => { x: number; y: number; anchor: 'middle' | 'start' };
  /** Half a box, along the line: the arrows fill only the gaps between the boxes. */
  half: number;
  /** The yellow line: out along one lane, round the reflector, back along the other. */
  line: string;
}

/** Across, as in the mockup: out on the top line, back on the bottom line. `r` is the reflector's column. */
function across(r: number): Layout {
  const x = (column: number) => (column === r ? 100 * r + 60 : 55 + 100 * column);
  return {
    viewBox: `0 0 ${100 * r + 140} 170`,
    at: (column, lane) => ({ x: x(column), y: lane === 'out' ? 45 : 105 }),
    box: (column) => ({ x: x(column) - 35, y: 15, width: 70, height: 115 }),
    label: (column) => ({ x: x(column), y: 152, anchor: 'middle' }),
    half: 35,
    line: `M70 45H${x(r)}Q${x(r) + 40} 45 ${x(r) + 40} 75Q${x(r) + 40} 105 ${x(r)} 105H70`,
  };
}

/** Top to bottom, for phones: out on the left line, back on the right line. `r` is the reflector's column. */
function down(r: number): Layout {
  const bottom = 80 * r + 35;
  return {
    viewBox: `0 0 300 ${80 * r + 100}`,
    at: (column, lane) => ({ x: lane === 'out' ? 50 : 110, y: 35 + 80 * column }),
    box: (column) => ({ x: 15, y: 7 + 80 * column, width: 130, height: 56 }),
    label: (column) => ({ x: 160, y: 40 + 80 * column, anchor: 'start' }),
    half: 28,
    line: `M50 50V${bottom}Q50 ${bottom + 40} 80 ${bottom + 40}Q110 ${bottom + 40} 110 ${bottom}V50`,
  };
}

/** The arrows on the yellow line: a darker gold, so they show on squared paper and on night paper. */
const ARROW = '#b8860b';

/**
 * Each letter of the path with its place: out through columns 0 to r − 1, the reflector in column r,
 * back through r − 1 to 1, the lamp. The path has 2r letters: 10 on the Enigma I, 12 on the M4.
 */
function placed(path: readonly PathPoint[]): { column: number; lane: Lane; letter: Letter; swap: boolean; lamp: boolean }[] {
  const r = path.length / 2;
  const last = path.length - 1;
  const out = Array.from({ length: r }, (_, column) => ({
    column,
    lane: 'out' as const,
    letter: path[column].letter,
    swap: column === 1 && path[1].letter !== path[0].letter,
    lamp: false,
  }));
  const reflector = { column: r, lane: 'back' as const, letter: path[r].letter, swap: false, lamp: false };
  const back = Array.from({ length: r - 1 }, (_, i) => ({
    column: r - 1 - i,
    lane: 'back' as const,
    letter: path[r + 1 + i].letter,
    swap: r - 1 - i === 1 && path[last].letter !== path[last - 1].letter,
    lamp: false,
  }));
  const lamp = { column: 0, lane: 'back' as const, letter: path[last].letter, swap: false, lamp: true };
  return [...out, reflector, ...back, lamp];
}

function Drawing({ layout, path, labels, name, className }: { layout: Layout; path: readonly PathPoint[]; labels: string[]; name: string; className: string }) {
  const r = path.length / 2;
  const arrows: string[] = [];
  for (let column = 0; column < r; column++) {
    for (const lane of ['out', 'back'] as const) {
      const [from, to] = lane === 'out' ? [layout.at(column, lane), layout.at(column + 1, lane)] : [layout.at(column + 1, lane), layout.at(column, lane)];
      const length = Math.hypot(to.x - from.x, to.y - from.y);
      const [dx, dy] = [(to.x - from.x) / length, (to.y - from.y) / length];
      // From the edge of one box to just before the next box.
      const [start, end] = [layout.half, layout.half + 2];
      arrows.push(`M${from.x + dx * start} ${from.y + dy * start}L${to.x - dx * end} ${to.y - dy * end}`);
    }
  }
  return (
    <svg viewBox={layout.viewBox} role="img" aria-label={name} className={`w-full ${className}`}>
      <defs>
        <marker id={`arrow-${layout.viewBox.replaceAll(' ', '-')}`} viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0 0L10 5L0 10z" fill={ARROW} />
        </marker>
      </defs>
      {Array.from({ length: r + 1 }, (_, column) => {
        const box = layout.box(column);
        return <rect key={column} {...box} rx="6" strokeWidth="2" className={`stroke-soft ${column === r ? 'fill-reflector' : 'fill-paper'}`} />;
      })}
      <path d={layout.line} fill="none" strokeWidth="5" className="stroke-lamp" />
      {arrows.map((d) => (
        <path key={d} d={d} stroke={ARROW} strokeWidth="2" markerEnd={`url(#arrow-${layout.viewBox.replaceAll(' ', '-')})`} />
      ))}
      {placed(path).map(({ column, lane, letter, swap, lamp }) => {
        const { x, y } = layout.at(column, lane);
        return (
          <g key={`${column}-${lane}-${lamp}`} data-letter data-swap={swap ? '' : undefined} data-lamp={lamp ? '' : undefined}>
            <circle cx={x} cy={y} r="15" strokeWidth={swap ? 3 : 2} className={`${lamp ? 'fill-lamp' : 'fill-cell'} ${swap ? 'stroke-pencil' : 'stroke-ink'}`} />
            <text x={x} y={y + 6} textAnchor="middle" className={`font-mono text-[17px] font-bold ${lamp ? 'fill-bakelite' : 'fill-ink'}`}>
              {letter}
            </text>
          </g>
        );
      })}
      {labels.map((text, column) => {
        const { x, y, anchor } = layout.label(column);
        return (
          <text key={text} x={x} y={y} textAnchor={anchor} data-part-label className="fill-muted font-sans text-[13px]">
            {text}
          </text>
        );
      })}
    </svg>
  );
}

/** The plug pair in the settings that holds both letters, such as "HZ" for H and Z. */
function pairOf(plugs: readonly string[], a: Letter, b: Letter): string {
  return plugs.find((pair) => pair.includes(a) && pair.includes(b)) ?? `${a}${b}`;
}

/**
 * "Where the current went for T" (spec R3 3): the path of the last letter as a picture. Wide screens
 * draw it across, phones top to bottom. A red ring marks each plugboard swap.
 */
export function CurrentPath({ settings, last }: { settings: MachineSettings; last: TypedLetter | null }) {
  const t = useTranslations('enigma.path');
  const [show, setShow] = useState(true);
  const [left, middle, right] = settings.rotors;
  const rotorName = { right, middle, left };
  const thinName = isM4(settings) ? settings.thinRotor : '';

  const thinRotor = isM4(settings) ? [t('rotor', { name: settings.thinRotor })] : [];
  const labels = [t('keyLamp'), t('plugboard'), t('rotor', { name: right }), t('rotor', { name: middle }), t('rotor', { name: left }), ...thinRotor, t('reflector')];
  const swaps =
    last === null
      ? []
      : [
          [last.path[0].letter, last.path[1].letter],
          [last.path[last.path.length - 2].letter, last.path[last.path.length - 1].letter],
        ]
          .filter(([from, to]) => from !== to)
          // Both swaps can be the same, such as A to V on the way in and on the way back. Say it once.
          .filter(([from, to], i, all) => all.findIndex(([otherFrom, otherTo]) => otherFrom === from && otherTo === to) === i);
  const name =
    last === null
      ? ''
      : [
          ...last.path.map(({ part, letter }) => {
            if (part === 'key') return t('labelKey', { letter });
            if (part === 'plugboard') return t('labelPlugboard', { letter });
            if (part === 'reflector') return t('labelReflector', { letter });
            // Screen readers hear "thin rotor Beta", so the 4th rotor is not taken for a 4th turning rotor.
            if (part === 'thin') return t('labelThinRotor', { name: thinName, letter });
            return t('labelRotor', { name: rotorName[part], letter });
          }),
          t('labelLamp', { letter: last.lamp }),
        ].join(', ');

  return (
    <section aria-labelledby="path-title" className="mt-4 border border-soft bg-cell px-4 py-3 sm:rounded-md">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="path-title" className="font-semibold">
          {last === null ? t('titleEmpty') : t('title', { letter: last.key })}
        </h2>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" role="switch" checked={show} onChange={(event) => setShow(event.target.checked)} className="size-4 accent-ink" />
          {t('show')}
        </label>
      </div>
      {last === null && <p className="mt-2 text-sm text-muted">{t('empty')}</p>}
      {last !== null && show && (
        <>
          <Drawing layout={across(last.path.length / 2)} path={last.path} labels={labels} name={name} className="mt-2 hidden sm:block" />
          <Drawing layout={down(last.path.length / 2)} path={last.path} labels={labels} name={name} className="mx-auto mt-2 max-w-[300px] sm:hidden" />
          <p className="mt-2 text-sm text-muted">
            <span className="hidden sm:inline">{t('outTop')}</span>
            <span className="sm:hidden">{t('outLeft')}</span>
            {swaps.map(([from, to]) => (
              <span key={`${from}${to}`}> {t('swap', { pair: pairOf(settings.plugs, from, to), from, to })}</span>
            ))}{' '}
            <span>{t('never')}</span>
          </p>
        </>
      )}
    </section>
  );
}
