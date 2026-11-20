'use client';

import { useTranslations } from 'next-intl';
import { useState, type Ref } from 'react';
import { checkAnswer, type AnswerCheck } from './key-sheet';
import { letterGroups, type LoadedMessage } from './MessageList';
import { readable } from './practice-messages';

const button = 'press border-2 border-ink bg-cell px-3 py-1.5 font-semibold text-ink';
const mainButton = 'press border-2 border-ink bg-ink px-3 py-1.5 font-semibold text-paper';

interface DecryptBoxProps {
  message: LoadedMessage;
  /** The letters the lamps lit since the message was loaded. */
  lit: string;
  /** The heading takes the focus when a message loads, so the page scrolls to it. */
  headingRef: Ref<HTMLHeadingElement>;
  onTypeForMe: () => void;
  onClose: () => void;
}

/**
 * The loaded message, above the machine: its secret letters, "Type it for me" and "Check my answer".
 * A check stays on screen until the lit letters change. A Bombe stop has no answer to check: the
 * box says instead that some plug pairs are unknown.
 */
export function DecryptBox({ message, lit, headingRef, onTypeForMe, onClose }: DecryptBoxProps) {
  const t = useTranslations('enigma.decrypt');
  const [checkedLit, setCheckedLit] = useState<string | null>(null);
  const { answer } = message.sheet;
  const check = answer !== null && checkedLit === lit ? checkAnswer(lit, answer) : null;

  const say = (result: AnswerCheck, answer: string) => {
    switch (result.result) {
      case 'empty':
        return t('empty');
      case 'right':
        return t('right', { text: readable(answer) });
      case 'so-far':
        return t('soFar', { right: result.right, total: result.total });
      case 'wrong':
        return t('wrong', { at: result.at });
    }
  };

  return (
    <section aria-labelledby="decrypt-title" className="mt-4 border-2 border-ink bg-cell px-4 py-3 sm:rounded">
      <h2 id="decrypt-title" ref={headingRef} tabIndex={-1} className="font-semibold">
        {t('title', { title: message.title })}
      </h2>
      <p className="mt-1 text-sm text-muted">{t('help')}</p>
      {answer === null && <p className="mt-1 text-sm text-muted">{t('partial')}</p>}
      <p className={`mt-2 ${letterGroups}`}>{message.sheet.cipher}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={onTypeForMe} className={button}>
          {t('typeForMe')}
        </button>
        {answer !== null && (
          <button type="button" onClick={() => setCheckedLit(lit)} className={mainButton}>
            {t('check')}
          </button>
        )}
        <button type="button" onClick={onClose} className={button}>
          {t('close')}
        </button>
      </div>
      <p aria-live="polite" className="mt-2 font-semibold break-words">
        {check !== null && answer !== null && say(check, answer)}
      </p>
    </section>
  );
}
