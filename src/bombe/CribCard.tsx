'use client';

import { useTranslations } from 'next-intl';
import type { Dispatch } from 'react';
import { crashesHere, cribLetters, HINT_CRIB_LETTERS, hints, placeCount, SECRET_MAX_LENGTH, secretLetters, type BombeAction, type BombeLab } from './lab-state';

export const card = 'border border-soft bg-cell px-4 py-3 sm:rounded';
export const cardTitle = 'font-semibold';
const button = 'press border-2 border-ink bg-cell px-3 py-1.5 font-semibold text-ink disabled:opacity-50';
const field = 'mt-1 w-full border border-soft bg-paper px-2.5 py-2 font-mono text-[15px] tracking-[1.5px] uppercase';
const cell = 'grid h-7 w-[22px] place-items-center rounded-[3px] font-mono text-sm font-bold';

/**
 * The crib card (spec R4 3): the secret letters, the crib, and the crib laid under the secret
 * letters at its place. ◀ and ▶ slide it, and stop at the first and last place. A letter that would
 * turn into itself shows in red.
 */
export function CribCard({ lab, dispatch }: { lab: BombeLab; dispatch: Dispatch<BombeAction> }) {
  const t = useTranslations('bombe.crib');
  const running = lab.search.status === 'running';
  const secret = secretLetters(lab);
  const crib = cribLetters(lab);
  const places = placeCount(lab);
  const crashed = new Set(crashesHere(lab));
  const { short, noLoop } = hints(lab);
  const under = secret.slice(lab.offset, lab.offset + crib.length);

  const status = () => {
    if (secret === '' || crib === '') return null;
    if (places === 0) return <p className="font-semibold text-pencil">{t('tooLong')}</p>;
    if (crashed.size > 0) return <p className="font-semibold text-pencil">✗ {t('crashes', { count: crashed.size })}</p>;
    return (
      <p className="font-semibold">
        <span aria-hidden className="text-drum-right">
          ✓{' '}
        </span>
        {t('fits')}
      </p>
    );
  };

  return (
    <section aria-labelledby="crib-title" className={card}>
      <h2 id="crib-title" className={cardTitle}>
        {t('title')}
      </h2>

      <label htmlFor="bombe-secret" className="mt-2 block text-sm font-semibold">
        {t('secret')}
      </label>
      <p id="bombe-secret-help" className="text-sm text-muted">
        {t('secretHelp')}
      </p>
      <textarea
        id="bombe-secret"
        aria-describedby="bombe-secret-help"
        rows={3}
        maxLength={SECRET_MAX_LENGTH}
        spellCheck={false}
        readOnly={running}
        value={lab.secretText}
        onChange={(event) => dispatch({ type: 'secret', text: event.target.value })}
        className={field}
      />
      <button type="button" disabled={running} onClick={() => dispatch({ type: 'practice' })} className={`${button} mt-2`}>
        {t('practice')}
      </button>
      <p className="mt-1 text-sm text-muted">{t('practiceAbout')}</p>

      <label htmlFor="bombe-crib" className="mt-4 block text-sm font-semibold">
        {t('crib')}
      </label>
      <input
        id="bombe-crib"
        type="text"
        autoCapitalize="characters"
        autoComplete="off"
        spellCheck={false}
        readOnly={running}
        value={lab.cribText}
        onChange={(event) => dispatch({ type: 'crib', text: event.target.value })}
        className={field}
      />

      {places > 0 && (
        <div className="mt-3">
          <p className="sr-only">{t('lined', { secret: under, crib })}</p>
          <div aria-hidden className="flex flex-wrap gap-0.5">
            {[...crib].map((letter, i) => {
              const crash = crashed.has(lab.offset + i);
              return (
                <span key={i} data-crash={crash || undefined} className="flex flex-col gap-0.5">
                  <span className={`${cell} ${crash ? 'border-2 border-pencil bg-cell text-pencil' : 'bg-soft text-ink'}`}>{under[i]}</span>
                  <span className={`${cell} border-2 ${crash ? 'border-pencil text-pencil' : 'border-ink text-ink'} bg-cell`}>{letter}</span>
                </span>
              );
            })}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button type="button" disabled={running} onClick={() => dispatch({ type: 'slide', by: -1 })} className={button}>
              <span aria-hidden>◀</span>
              <span className="sr-only">{t('slideLeft')}</span>
            </button>
            <button type="button" disabled={running} onClick={() => dispatch({ type: 'slide', by: 1 })} className={button}>
              <span aria-hidden>▶</span>
              <span className="sr-only">{t('slideRight')}</span>
            </button>
            <span className="text-sm text-muted">{t('place', { place: lab.offset + 1, count: places })}</span>
          </div>
        </div>
      )}

      <div aria-live="polite" className="mt-2">
        {status()}
      </div>
      {short && <p className="mt-1 text-sm text-muted">{t('hintShort', { count: HINT_CRIB_LETTERS })}</p>}
      {noLoop && <p className="mt-1 text-sm text-muted">{t('hintNoLoop')}</p>}
    </section>
  );
}
