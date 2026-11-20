'use client';

import { useTranslations } from 'next-intl';
import { KEY_ROWS, type Letter, type Positions, type RotorName, type Three } from '@/engines/enigma';
import { Lampboard, round } from './Lampboard';

const SLOTS = [
  { slot: 0, name: 'left' },
  { slot: 1, name: 'middle' },
  { slot: 2, name: 'right' },
] as const;

/** The focus outline is lamp yellow on the panel: pencil red is too dark on bakelite. */
const onPanel = 'focus-visible:outline-lamp';

interface MachinePanelProps {
  rotors: Three<RotorName>;
  positions: Positions;
  /** The lamp that is lit, or null before the first key. */
  lit: Letter | null;
  /** The key pressed last, drawn pushed down. */
  lastKey: Letter | null;
  onPress: (key: Letter) => void;
  onTurn: (slot: 0 | 1 | 2, by: 1 | -1) => void;
}

/**
 * The machine from the mockup (lab-c-v2.html): the rotor windows with ▲ and ▼, the lampboard, and
 * the keyboard, on a bakelite panel. Screen readers skip the lampboard: the live region and the
 * "Lamps lit" strip say which lamp lit.
 */
export function MachinePanel({ rotors, positions, lit, lastKey, onPress, onTurn }: MachinePanelProps) {
  const t = useTranslations('enigma.machine');
  return (
    <section aria-label={t('label')} className="rounded-[10px] bg-bakelite px-3 py-3.5 text-ivory sm:px-4">
      <div className="flex justify-center gap-4 sm:gap-5">
        {SLOTS.map(({ slot, name }) => {
          const rotor = t(name);
          return (
            <div key={name} className="flex flex-col items-center">
              <button type="button" onClick={() => onTurn(slot, 1)} className={`h-7 w-10 text-sm text-brass transition-colors hover:text-lamp ${onPanel}`}>
                <span aria-hidden>▲</span>
                <span className="sr-only">{t('next', { rotor })}</span>
              </button>
              <span className="sr-only">{t('window', { rotor, name: rotors[slot], letter: positions[slot] })}</span>
              <span aria-hidden className="rounded-[3px] border-2 border-brass bg-ivory px-2.5 py-0.5 font-mono text-xl font-bold text-bakelite">
                {positions[slot]}
              </span>
              <button type="button" onClick={() => onTurn(slot, -1)} className={`h-7 w-10 text-sm text-brass transition-colors hover:text-lamp ${onPanel}`}>
                <span aria-hidden>▼</span>
                <span className="sr-only">{t('previous', { rotor })}</span>
              </button>
              <span aria-hidden className="font-display text-xs text-brass">
                {rotors[slot]}
              </span>
            </div>
          );
        })}
      </div>
      <p className="mt-1 mb-3 text-center text-xs text-brass">{t('note')}</p>

      <Lampboard lit={lit} />

      <div role="group" aria-label={t('keyboard')} className="mt-4">
        {KEY_ROWS.map((row) => (
          <div key={row.join('')} className="my-1.5 flex justify-center gap-1 sm:gap-1.5">
            {row.map((letter) => (
              <button
                key={letter}
                type="button"
                onClick={() => onPress(letter)}
                className={`${round} press border-2 border-brass [--press-shadow:var(--brass)] text-bakelite ${letter === lastKey ? 'bg-brass' : 'bg-ivory'} ${onPanel}`}
              >
                {letter}
              </button>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
