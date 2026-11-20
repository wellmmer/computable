'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';
import { useSimulator } from './store-context';

const button = 'press border-2 border-ink px-3 py-1.5 font-semibold';

/**
 * Asks before a share link replaces a machine the visitor built. The store holds the link's machine
 * in `pendingLink` and saves nothing until "Replace". Esc means "Keep mine", the safe answer, which
 * also has the focus. When the dialog closes, the browser returns the focus to where it was.
 */
export function ReplaceLinkDialog() {
  const t = useTranslations('simulator.replaceLink');
  const asking = useSimulator((s) => s.pendingLink !== null);
  const replaceWithLink = useSimulator((s) => s.replaceWithLink);
  const keepMachine = useSimulator((s) => s.keepMachine);
  const dialog = useRef<HTMLDialogElement>(null);
  const keep = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const element = dialog.current;
    if (element === null) return;
    if (asking && !element.open) {
      element.showModal();
      keep.current?.focus();
    } else if (!asking && element.open) {
      element.close();
    }
  }, [asking]);

  return (
    <dialog
      ref={dialog}
      aria-labelledby="replace-link-title"
      aria-describedby="replace-link-text"
      onCancel={(event) => {
        // Esc: the store closes the dialog through `asking`.
        event.preventDefault();
        keepMachine();
      }}
      className="m-auto w-[min(26rem,calc(100vw-2rem))] border-2 border-ink bg-cell p-5 text-ink backdrop:bg-ink/50"
    >
      <h2 id="replace-link-title" className="font-display text-xl font-semibold">
        {t('title')}
      </h2>
      <p id="replace-link-text" className="mt-3">
        {t('text')}
      </p>
      <div className="mt-5 flex flex-wrap justify-end gap-3">
        <button ref={keep} type="button" onClick={keepMachine} className={`${button} bg-cell text-ink`}>
          {t('keep')}
        </button>
        <button type="button" onClick={replaceWithLink} className={`${button} bg-ink text-paper`}>
          {t('replace')}
        </button>
      </div>
    </dialog>
  );
}
