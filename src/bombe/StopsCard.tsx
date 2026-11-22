'use client';

import { useTranslations } from 'next-intl';
import type { Stop } from '@/engines/bombe';
import { tryHash } from '@/enigma/try-link';
import { Link } from '@/i18n/navigation';
import { card, cardTitle } from './CribCard';
import type { Search } from './lab-state';

/** The Enigma lab link for a stop: its key, rings A A A, reflector B, and the secret letters. */
function tryLink({ rotors, start, plugs }: Stop, cipher: string): string {
  return `/enigma${tryHash({ settings: { rotors, rings: ['A', 'A', 'A'], reflector: 'B', plugs }, start, cipher })}`;
}

/**
 * The stops card (spec R4 3): each stop's rotor order, start and plug pairs. "Try in the Enigma lab"
 * opens the lab with the stop's key and the secret letters in its decrypt box.
 */
export function StopsCard({ search, cipher }: { search: Search; cipher: string }) {
  const t = useTranslations('bombe.stops');
  const { status, stops, count } = search;

  return (
    <section aria-labelledby="stops-title" className={card}>
      <h2 id="stops-title" className={cardTitle}>
        {t('title')}
      </h2>
      {status === 'idle' && <p className="mt-1 text-sm text-muted">{t('empty')}</p>}
      {status === 'finished' && count === 0 && <p className="mt-1 text-sm text-muted">{t('none')}</p>}
      {status === 'stopped' && count === 0 && <p className="mt-1 text-sm text-muted">{t('stopped')}</p>}
      {stops.length > 0 && (
        <>
          <ol className="mt-2 space-y-3">
            {stops.map((stop) => {
              const rotors = stop.rotors.join(' ');
              const start = stop.start.join(' ');
              return (
                <li key={`${rotors}${start}${stop.plugs.join('')}`} className="border-t border-soft pt-2 first:border-t-0 first:pt-0">
                  <p className="font-mono font-semibold">{t('item', { rotors, start })}</p>
                  <p className="text-sm">{stop.plugs.length === 0 ? t('noPlugs') : t('plugs', { plugs: stop.plugs.join(' ') })}</p>
                  <Link
                    href={tryLink(stop, cipher)}
                    aria-label={t('tryLabel', { rotors, start })}
                    className="press mt-1.5 inline-block border-2 border-ink bg-ink px-3 py-1.5 font-semibold text-paper"
                  >
                    {t('try')}
                  </Link>
                </li>
              );
            })}
          </ol>
          {count > stops.length && <p className="mt-3 text-sm text-muted">{t('more', { count, shown: stops.length })}</p>}
          <p className="mt-2 text-sm text-muted">{t('unknown')}</p>
        </>
      )}
    </section>
  );
}
