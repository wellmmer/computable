'use client';

import { Pause, Play, StepBack, StepForward } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState, type Dispatch } from 'react';
import type { TestStep } from '@/engines/bombe';
import type { RotorName, Three } from '@/engines/enigma';
import { card, cardTitle } from './CribCard';
import { blocker, menuOf, slowTestKey, type BombeAction, type BombeLab } from './lab-state';

/** Play moves one step this often. */
export const PLAY_STEP_MS = 400;

const button = 'press inline-flex items-center gap-1.5 border-2 border-ink px-3 py-1.5 font-semibold disabled:cursor-not-allowed disabled:opacity-50';

interface SlowTestCardProps {
  lab: BombeLab;
  /** The rotor orders of the search, as the drum wall shows them. */
  orders: readonly Three<RotorName>[];
  dispatch: Dispatch<BombeAction>;
}

/**
 * Slow step mode (spec R4 4): "Watch one test slowly" runs one test with Back, Play and Step, as in
 * the simulator. Each step has one sentence. The drum wall and the menu drawing mark the link in use.
 * Play has no animation: each step changes the marks at once, so it is the same with reduced motion.
 * Screen readers hear each step the visitor asks for; during Play, they hear only the last one.
 */
export function SlowTestCard({ lab, orders, dispatch }: SlowTestCardProps) {
  const t = useTranslations('bombe.slow');
  const [playing, setPlaying] = useState(false);
  const watchButton = useRef<HTMLButtonElement>(null);
  const backButton = useRef<HTMLButtonElement>(null);
  const playButton = useRef<HTMLButtonElement>(null);
  const stepButton = useRef<HTMLButtonElement>(null);
  /** Where the focus goes after the card opens or closes: the button that was pressed is gone. */
  const focusNext = useRef<'step' | 'watch' | null>(null);
  const { slow } = lab;
  const opened = slow !== null;
  const menu = menuOf(lab);
  const canOpen = lab.search.status !== 'running' && blocker(lab) === null;
  const last = slow === null ? 0 : slow.steps.length - 1;
  const atEnd = slow !== null && slow.at === last;
  const isPlaying = playing && slow !== null && !atEnd;

  useEffect(() => {
    if (!isPlaying) return;
    const timer = window.setInterval(() => dispatch({ type: 'slow-step', by: 1 }), PLAY_STEP_MS);
    return () => window.clearInterval(timer);
  }, [isPlaying, dispatch]);

  useEffect(() => {
    if (focusNext.current === 'step') stepButton.current?.focus();
    if (focusNext.current === 'watch') watchButton.current?.focus();
    focusNext.current = null;
  }, [opened]);

  // Step and Play turn off at the last step, and Back at the first. The focus moves to a button that still works.
  useEffect(() => {
    if (slow === null) return;
    const focused = document.activeElement;
    if (atEnd && (focused === stepButton.current || focused === playButton.current || focused === document.body)) backButton.current?.focus();
    if (slow.at === 0 && focused === backButton.current) stepButton.current?.focus();
  }, [slow, atEnd]);

  const open = () => {
    const { rotors, start } = slowTestKey(lab.search, orders);
    setPlaying(false);
    focusNext.current = 'step';
    dispatch({ type: 'slow-open', rotors, start });
  };

  const close = () => {
    setPlaying(false);
    focusNext.current = 'watch';
    dispatch({ type: 'slow-close' });
  };

  const center = menu.center ?? '';
  const say = (step: TestStep): string => {
    switch (step.kind) {
      case 'enter':
        return t('enter', { letter: step.letter, wire: step.wire });
      case 'link': {
        const { plain, cipher } = menu.links[step.link];
        return t('link', { number: step.link + 1, plain, cipher, from: step.from, fromWire: step.fromWire, to: step.to, toWire: step.toWire });
      }
      case 'mirror':
        return t('mirror', { letter: step.letter, wire: step.wire });
      case 'end':
        return step.stop ? t('stop', { lit: step.lit, center }) : t('noStop', { center });
    }
  };

  const step = slow?.steps[slow.at];

  return (
    <section aria-labelledby="slow-title" className={card}>
      <h2 id="slow-title" className={cardTitle}>
        {t('title')}
      </h2>
      {slow === null || step === undefined ? (
        <>
          <p className="mt-1 text-sm text-muted">{t('about')}</p>
          <button ref={watchButton} type="button" disabled={!canOpen} onClick={open} className={`${button} mt-2 bg-cell text-ink`}>
            {t('watch')}
          </button>
        </>
      ) : (
        <>
          <p className="mt-1 font-mono text-sm font-semibold">{t('which', { rotors: slow.rotors.join(' '), start: slow.start.join(' ') })}</p>
          <div className="mt-1 flex flex-wrap justify-between gap-x-4 text-sm text-muted">
            <span>{t('progress', { step: slow.at + 1, total: slow.steps.length })}</span>
            <span>{t('lit', { center, lit: step.lit })}</span>
          </div>
          <p data-testid="slow-sentence" className="mt-2 min-h-[3lh] font-display text-lg/snug">
            {say(step)}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button ref={backButton} type="button" disabled={slow.at === 0} onClick={() => dispatch({ type: 'slow-step', by: -1 })} className={`${button} bg-cell text-ink`}>
              <StepBack aria-hidden className="size-4" />
              {t('back')}
            </button>
            <button ref={playButton} type="button" disabled={atEnd} onClick={() => setPlaying(!isPlaying)} className={`${button} min-w-28 bg-ink text-paper`}>
              {isPlaying ? <Pause aria-hidden className="size-4" /> : <Play aria-hidden className="size-4" />}
              {isPlaying ? t('pause') : t('play')}
            </button>
            <button ref={stepButton} type="button" disabled={atEnd} onClick={() => dispatch({ type: 'slow-step', by: 1 })} className={`${button} bg-cell text-ink`}>
              <StepForward aria-hidden className="size-4" />
              {t('step')}
            </button>
            <button type="button" onClick={close} className={`${button} bg-cell text-ink`}>
              {t('close')}
            </button>
          </div>
        </>
      )}
      {/* Not role="status": the drum wall's search news is the page's one status. */}
      <p data-testid="slow-news" aria-live="polite" className="sr-only">
        {slow !== null && step !== undefined && !isPlaying && <span key={slow.at}>{say(step)}</span>}
      </p>
    </section>
  );
}
