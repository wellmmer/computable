'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useReducer, useRef, useState } from 'react';
import { isLetter } from '@/engines/enigma';
import { CurrentPath } from './CurrentPath';
import { groupsOf5, initialLab, labReducer, litLetters, typedLetters } from './lab-state';
import { MachinePanel } from './MachinePanel';
import { SettingsDialog } from './SettingsDialog';

const button = 'border-2 border-ink px-3 py-1.5 font-semibold disabled:opacity-50';
const strip = 'min-h-11 border border-soft bg-cell px-2.5 py-2 font-mono text-[17px] font-medium tracking-[2px] [word-spacing:6px] break-words';

/** Typing in these fields must not press Enigma keys. */
const TEXT_FIELDS = 'input:not([type="checkbox"]):not([type="radio"]), select, textarea, [contenteditable]';

/**
 * The Enigma lab (spec R3 3, mockup lab-c-v2.html). Settings and typed letters live in this page
 * only: a reload starts again from the defaults. On phones, "Lamps lit" sits above the machine, so a
 * thumb on the keys never covers it; from 768 px, the strips and buttons sit right of the machine.
 */
export function EnigmaLab() {
  const t = useTranslations('enigma.lab');
  const tSettings = useTranslations('enigma.settings');
  const [lab, dispatch] = useReducer(labReducer, undefined, initialLab);
  const [changing, setChanging] = useState(false);
  const [copied, setCopied] = useState<'copied' | 'copyFailed' | null>(null);
  const changeButton = useRef<HTMLButtonElement>(null);

  // The physical keyboard: letters press keys, Backspace takes the last one back.
  useEffect(() => {
    if (changing) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
      if (event.target instanceof Element && event.target.closest(TEXT_FIELDS) !== null) return;
      if (event.key === 'Backspace') {
        event.preventDefault();
        dispatch({ type: 'backspace' });
        return;
      }
      const key = event.key.toUpperCase();
      if (isLetter(key)) {
        event.preventDefault();
        dispatch({ type: 'press', key });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [changing]);

  // "Copied" goes back to "Copy lit letters" after 2 seconds.
  useEffect(() => {
    if (copied === null) return;
    const timer = window.setTimeout(() => setCopied(null), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const lit = litLetters(lab);
  const last = lab.typed.at(-1) ?? null;
  const { rotors, rings, reflector, plugs } = lab.settings;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(groupsOf5(lit));
      setCopied('copied');
    } catch {
      setCopied('copyFailed');
    }
  };

  return (
    <>
      <section aria-label={t('settings')} className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-1.5 border border-soft bg-cell px-3.5 py-2.5 sm:rounded">
        <dl className="hidden flex-wrap gap-x-6 gap-y-1.5 sm:flex">
          {[
            [tSettings('rotors'), rotors.join(' ')],
            [tSettings('rings'), rings.join(' ')],
            [tSettings('plugs'), plugs.length === 0 ? tSettings('noPlugs') : plugs.join(' ')],
            [tSettings('reflector'), reflector],
          ].map(([term, value]) => (
            <div key={term}>
              <dt className="text-[13px] text-muted">{term}</dt>
              <dd className="font-mono font-semibold">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="text-sm text-muted sm:hidden">{t('summary', { rotors: rotors.join(' '), reflector, count: plugs.length })}</p>
        <button ref={changeButton} type="button" onClick={() => setChanging(true)} className={`${button} ml-auto bg-cell text-ink`}>
          <span className="sm:hidden">{t('change')}</span>
          <span className="hidden sm:inline">{t('changeSettings')}</span>
        </button>
      </section>

      <div className="mt-4 grid gap-4 md:grid-cols-[1.25fr_1fr] md:grid-rows-[auto_auto_1fr]">
        <section aria-labelledby="lit-title" className="md:col-start-2 md:row-start-2">
          <h2 id="lit-title" className="mb-1 font-semibold">
            {t('lit')}
          </h2>
          <div data-strip className={`${strip} border-l-4 border-l-lamp`}>
            {groupsOf5(lit)}
          </div>
        </section>

        <div className="md:col-start-1 md:row-span-3 md:row-start-1">
          <MachinePanel
            rotors={rotors}
            positions={lab.positions}
            lit={last?.lamp ?? null}
            lastKey={last?.key ?? null}
            onPress={(key) => dispatch({ type: 'press', key })}
            onTurn={(slot, by) => dispatch({ type: 'turn', slot, by })}
          />
        </div>

        <section aria-labelledby="typed-title" className="md:col-start-2 md:row-start-1">
          <h2 id="typed-title" className="mb-1 font-semibold">
            {t('typed')}
          </h2>
          <div data-strip className={strip}>
            {groupsOf5(typedLetters(lab))}
          </div>
        </section>

        <div className="md:col-start-2 md:row-start-3">
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => dispatch({ type: 'back-to-start' })} className={`${button} bg-ink text-paper`}>
              {t('backToStart', { start: lab.start.join(' ') })}
            </button>
            <button type="button" onClick={copy} disabled={lit === ''} className={`${button} bg-cell text-ink`}>
              {t(copied ?? 'copy')}
            </button>
            <button type="button" onClick={() => dispatch({ type: 'clear' })} className={`${button} bg-cell text-ink`}>
              {t('clear')}
            </button>
          </div>
          <p className="mt-2 text-sm text-muted">{t('hint')}</p>
          {lab.previousLit !== '' && <p className="mt-2 font-mono text-sm">{t('previousLit', { letters: groupsOf5(lab.previousLit) })}</p>}
        </div>
      </div>

      <CurrentPath settings={lab.settings} last={last} />

      <p role="status" className="sr-only">
        {lab.news !== null && <span key={lab.news.id}>{t(lab.news.kind === 'lit' ? 'litNews' : 'removedNews', { letter: lab.news.letter })}</span>}
      </p>

      {changing && (
        <SettingsDialog
          settings={lab.settings}
          onSave={(settings) => dispatch({ type: 'settings', settings })}
          onClose={() => {
            setChanging(false);
            changeButton.current?.focus();
          }}
        />
      )}
    </>
  );
}
