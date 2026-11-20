'use client';

import { useTranslations } from 'next-intl';
import { startAt, type Menu } from '@/engines/bombe';
import { indexOf, type Letter, type Positions, type RotorName, type Three } from '@/engines/enigma';
import { drumLetters, WALL_ENIGMAS, type Blocker, type Search } from './lab-state';

/** Left rotor red, middle yellow, right green (spec R4, from the R1 spec). */
const DRUM_COLORS = ['bg-drum-left text-on-drum', 'bg-drum-middle text-bakelite', 'bg-drum-right text-on-drum'] as const;

/** The wall shows its Enigmas in rows of 6. Without a menu, it shows 6 empty ones. */
const EMPTY_WALL: (Positions | null)[] = Array.from({ length: 6 }, () => null);

const STARTS: Positions = ['A', 'A', 'A'];

interface DrumWallProps {
  menu: Menu;
  search: Search;
  /** The rotor orders of the search under way, or of the next search. */
  orders: readonly Three<RotorName>[];
  reducedMotion: boolean;
  /** Why Start does not work now, or null. */
  blocked: Blocker | null;
  onStart: () => void;
  onStop: () => void;
}

function Drum({ letter, slot }: { letter: Letter | null; slot: 0 | 1 | 2 }) {
  const turn = letter === null ? 0 : (indexOf(letter) * 360) / 26;
  return (
    <span data-drum className={`relative grid size-8 place-items-center rounded-full border-[3px] border-black font-mono text-sm font-bold sm:size-9 ${DRUM_COLORS[slot]}`}>
      {/* A mark on the drum's edge turns with the letter, so the drum looks like it turns. */}
      <span className="absolute inset-0 transition-[rotate] duration-150 motion-reduce:transition-none" style={{ rotate: `${turn}deg` }}>
        <span className="absolute top-0 left-1/2 h-1.5 w-0.5 -translate-x-1/2 bg-current opacity-70" />
      </span>
      <span className="relative">{letter}</span>
    </span>
  );
}

/**
 * The drum wall (spec R4 3, layout B): one Enigma for each menu link, up to 12, each with 3 drums.
 * The drums show the start under test and turn during the search. With reduced motion, they stay
 * at the first start; only the counter changes.
 */
export function DrumWall({ menu, search, orders, reducedMotion, blocked, onStart, onStop }: DrumWallProps) {
  const t = useTranslations('bombe.wall');
  const running = search.status === 'running';
  const testing = reducedMotion ? null : search.testing;
  const rotors = orders[testing?.order ?? 0];
  const wall = menu.links.length === 0 ? EMPTY_WALL : drumLetters(menu, rotors, testing === null ? STARTS : startAt(testing.start));
  const total = search.status === 'idle' ? orders.length : search.total;
  const current = search.testing === null ? search.done : search.testing.order + 1;

  const news = () => {
    if (search.status === 'finished') return t('finished', { total, count: search.count });
    if (search.status === 'stopped') return t('stopped', { done: search.done, total });
    return null;
  };
  const reasons = { 'no-secret': 'noSecret', 'no-crib': 'noCrib', 'crib-too-long': 'tooLong', crash: 'crash' } as const;

  return (
    <section aria-labelledby="wall-title" className="rounded-[10px] bg-bakelite px-3 py-3.5 text-ivory sm:px-4">
      <h2 id="wall-title" className="font-display text-lg text-brass">
        {t('title')}
      </h2>
      <div aria-hidden className="mt-2 grid grid-cols-6 justify-items-center gap-x-1.5 gap-y-3">
        {wall.map((windows, enigma) => (
          <span key={enigma} data-enigma className="flex flex-col gap-1">
            {([0, 1, 2] as const).map((slot) => (
              <Drum key={slot} slot={slot} letter={windows === null ? null : windows[slot]} />
            ))}
          </span>
        ))}
      </div>
      <p className="mt-2 text-xs text-brass">{t('legend')}</p>
      {menu.links.length > WALL_ENIGMAS && <p className="text-xs text-brass">{t('more', { count: menu.links.length })}</p>}

      <div
        role="progressbar"
        aria-label={t('progress')}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={search.done}
        className="mt-3 h-1.5 overflow-hidden rounded-full bg-lamp-off"
      >
        <div className="h-full bg-lamp" style={{ width: `${total === 0 ? 0 : (100 * search.done) / total}%` }} />
      </div>
      <div className="mt-2 flex flex-wrap justify-between gap-x-4 text-sm text-brass">
        <span>{t('order', { current, total })}</span>
        <span>{t('stops', { count: search.count })}</span>
      </div>
      {search.status !== 'idle' && <p className="text-sm text-brass">{t('testing', { rotors: orders[search.testing?.order ?? 0].join(' ') })}</p>}

      <button
        type="button"
        disabled={!running && blocked !== null}
        onClick={running ? onStop : onStart}
        className="press mt-3 border-2 border-lamp bg-lamp px-4 py-1.5 font-semibold text-bakelite [--press-shadow:var(--brass)] focus-visible:outline-lamp disabled:opacity-50"
      >
        {t(running ? 'stop' : 'start')}
      </button>
      {!running && blocked !== null && <p className="mt-2 text-sm text-brass">{t(reasons[blocked])}</p>}
      <p role="status" className="mt-2 text-sm font-semibold text-lamp">
        {news()}
      </p>
    </section>
  );
}
