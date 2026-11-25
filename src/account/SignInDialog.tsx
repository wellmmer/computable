'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';
import type { Provider } from './account-client';

const button = 'press border-2 border-ink px-3 py-1.5 font-semibold';

interface SignInDialogProps {
  /** True when the last sign-in did not finish. The dialog then says so. */
  failed: boolean;
  onSignIn: (provider: Provider) => void;
  /** Called when the dialog has closed: after Close or Esc. */
  onClose: () => void;
}

/**
 * The "Sign in" dialog (spec R5b 4). Each button opens the sign-in page of its service. The menu
 * mounts the dialog to open it. When it closes, the browser returns the focus to where it was.
 */
export function SignInDialog({ failed, onSignIn, onClose }: SignInDialogProps) {
  const t = useTranslations('shell.account');
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (dialog.current?.open === false) dialog.current.showModal();
  }, []);

  return (
    <dialog
      ref={dialog}
      aria-labelledby="sign-in-title"
      aria-describedby="sign-in-text"
      onClose={onClose}
      className="m-auto w-[min(26rem,calc(100vw-2rem))] border-2 border-ink bg-cell p-5 text-ink backdrop:bg-ink/50"
    >
      <h2 id="sign-in-title" className="font-display text-xl font-semibold">
        {t('signIn')}
      </h2>
      <p id="sign-in-text" className="mt-3">
        {t('why')}
      </p>
      {failed && (
        <p role="alert" className="mt-3 font-medium text-pencil">
          {t('signInFailed')}
        </p>
      )}
      <div className="mt-5 flex flex-col gap-3">
        <button type="button" onClick={() => onSignIn('google')} className={`${button} bg-ink text-paper`}>
          {t('google')}
        </button>
        <button type="button" onClick={() => onSignIn('github')} className={`${button} bg-ink text-paper`}>
          {t('github')}
        </button>
      </div>
      <p className="mt-4 text-sm text-muted">{t('optional')}</p>
      <div className="mt-5 flex justify-end">
        <button type="button" onClick={() => dialog.current?.close()} className={`${button} bg-cell text-ink`}>
          {t('close')}
        </button>
      </div>
    </dialog>
  );
}
