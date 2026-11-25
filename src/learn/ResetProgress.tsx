'use client';

import { useTranslations } from 'next-intl';
import { useId, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { accountConfig } from '@/account/config';
import { resetProgress } from './progress';

const button = 'border-2 border-ink px-3 py-1.5 font-semibold press';

/**
 * "Reset my progress" on the Learn page (spec 2.1). It asks first, because the results cannot come back.
 * With accounts, the question says the reset also clears the account copy of a signed-in person (spec R5b 5).
 */
export function ResetProgress() {
  const t = useTranslations('learn.reset');
  const questionId = useId();
  const [stage, setStage] = useState<'idle' | 'confirm' | 'done'>('idle');
  const resetButton = useRef<HTMLButtonElement>(null);
  const cancelButton = useRef<HTMLButtonElement>(null);

  // The focus follows the buttons that appear: Cancel is the safe choice, and the reset button comes back after.
  const ask = () => {
    flushSync(() => setStage('confirm'));
    cancelButton.current?.focus();
  };
  const answer = (clear: boolean) => {
    if (clear) resetProgress();
    flushSync(() => setStage(clear ? 'done' : 'idle'));
    resetButton.current?.focus();
  };

  return (
    <div className="mt-10">
      {stage === 'confirm' ? (
        <div role="group" aria-labelledby={questionId} className="flex flex-wrap items-center gap-3">
          <p id={questionId} className="w-full font-semibold">
            {accountConfig() === null ? t('question') : t('questionAccounts')}
          </p>
          <button type="button" onClick={() => answer(true)} className={`${button} bg-ink text-paper`}>
            {t('confirm')}
          </button>
          <button ref={cancelButton} type="button" onClick={() => answer(false)} className={`${button} bg-cell text-ink`}>
            {t('cancel')}
          </button>
        </div>
      ) : (
        <button ref={resetButton} type="button" onClick={ask} className={`${button} bg-cell text-ink`}>
          {t('button')}
        </button>
      )}
      <p role="status" className="mt-3 text-sm text-muted">
        {stage === 'done' && t('done')}
      </p>
    </div>
  );
}
