'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type { EnigmaSettings, Letter, PathPoint } from '@/engines/enigma';
import type { TypedLetter } from './lab-state';

/** Out to the reflector, or back from it. */
type Lane = 'out' | 'back';

/** Where the parts sit: column 0 is the key and lamp, 1 the plugboard, 2 to 4 the rotors, 5 the reflector. */
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

/** Across, as in the mockup: out on the top line, back on the bottom line. */
const ACROSS: Layout = {
  viewBox: '0 0 640 170',
  at: (column, lane) => ({ x: column === 5 ? 560 : 55 + 100 * column, y: lane === 'out' ? 45 : 105 }),
  box: (column) => ({ x: column === 5 ? 525 : 20 + 100 * column, y: 15, width: 70, height: 115 }),
  label: (column) => ({ x: column === 5 ? 560 : 55 + 100 * column, y: 152, anchor: 'middle' }),
  half: 35,
  line: 'M70 45H560Q600 45 600 75Q600 105 560 105H70',
};

/** Top to bottom, for phones: out on the left line, back on the right line. */
const DOWN: Layout = {
  viewBox: '0 0 300 500',
  at: (column, lane) => ({ x: lane === 'out' ? 50 : 110, y: 35 + 80 * column }),
  box: (column) => ({ x: 15, y: 7 + 80 * column, width: 130, height: 56 }),
  label: (column) => ({ x: 160, y: 40 + 80 * column, anchor: 'start' }),
  half: 28,
  line: 'M50 50V435Q50 475 80 475Q110 475 110 435V50',
};

/** The arrows on the yellow line: a darker gold, so they show on squared paper and on night paper. */
const ARROW = '#b8860b';

/** Each letter of the path with its place: out through columns 0 to 4, the reflector, back through 4 to 1, the lamp. */
function placed(path: readonly PathPoint[]): { column: number; lane: Lane; letter: Letter; swap: boolean; lamp: boolean }[] {
  const out = [0, 1, 2, 3, 4].map((column) => ({
    column,
    lane: 'out' as const,
    letter: path[column].letter,
    swap: column === 1 && path[1].letter !== path[0].letter,
    lamp: false,
  }));
  const reflector = { column: 5, lane: 'back' as const, letter: path[5].letter, swap: false, lamp: false };
  const back = [4, 3, 2, 1].map((column, i) => ({
    column,
    lane: 'back' as const,
    letter: path[6 + i].letter,
    swap: column === 1 && path[9].letter !== path[8].letter,
    lamp: false,
  }));
  const lamp = { column: 0, lane: 'back' as const, letter: path[9].letter, swap: false, lamp: true };
  return [...out, reflector, ...back, lamp];
}

function Drawing({ layout, path, labels, name, className }: { layout: Layout; path: readonly PathPoint[]; labels: string[]; name: string; className: string }) {
  const arrows: string[] = [];
  for (let column = 0; column < 5; column++) {
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
      {[0, 1, 2, 3, 4, 5].map((column) => {
        const box = layout.box(column);
        return <rect key={column} {...box} rx="6" strokeWidth="2" className={`stroke-soft ${column === 5 ? 'fill-reflector' : 'fill-paper'}`} />;
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
export function CurrentPath({ settings, last }: { settings: EnigmaSettings; last: TypedLetter | null }) {
  const t = useTranslations('enigma.path');
  const [show, setShow] = useState(true);
  const [left, middle, right] = settings.rotors;
  const rotorName = { right, middle, left };

  const labels = [t('keyLamp'), t('plugboard'), t('rotor', { name: right }), t('rotor', { name: middle }), t('rotor', { name: left }), t('reflector')];
  const swaps =
    last === null
      ? []
      : [
          [last.path[0].letter, last.path[1].letter],
          [last.path[8].letter, last.path[9].letter],
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
          <Drawing layout={ACROSS} path={last.path} labels={labels} name={name} className="mt-2 hidden sm:block" />
          <Drawing layout={DOWN} path={last.path} labels={labels} name={name} className="mx-auto mt-2 max-w-[300px] sm:hidden" />
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
