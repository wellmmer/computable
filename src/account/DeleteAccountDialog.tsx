'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';

const button = 'press border-2 border-ink px-3 py-1.5 font-semibold disabled:opacity-60';

interface DeleteAccountDialogProps {
  /** Deletes the account. Resolves false when the deletion failed. */
  onDelete: () => Promise<boolean>;
  /** Called when the dialog has closed: after Cancel, Esc or a deletion. */
  onClose: () => void;
}

/**
 * Asks before "Delete my account" deletes anything (spec R5b 4). Cancel, the safe answer, has the
 * focus. When the deletion fails, the dialog stays open and says so (spec R5b 6).
 */
export function DeleteAccountDialog({ onDelete, onClose }: DeleteAccountDialogProps) {
  const t = useTranslations('shell.account');
  const dialog = useRef<HTMLDialogElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const [failed, setFailed] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (dialog.current?.open === false) {
      dialog.current.showModal();
      cancel.current?.focus();
    }
  }, []);

  const deleteAccount = async () => {
    setDeleting(true);
    setFailed(false);
    const deleted = await onDelete();
    setDeleting(false);
    if (deleted) dialog.current?.close();
    else setFailed(true);
  };

  return (
    <dialog
      ref={dialog}
      aria-labelledby="delete-account-title"
      aria-describedby="delete-account-text"
      onClose={onClose}
      className="m-auto w-[min(26rem,calc(100vw-2rem))] border-2 border-ink bg-cell p-5 text-ink backdrop:bg-ink/50"
    >
      <h2 id="delete-account-title" className="font-display text-xl font-semibold">
        {t('delete')}
      </h2>
      <p id="delete-account-text" className="mt-3">
        {t('deleteText')}
      </p>
      {failed && (
        <p role="alert" className="mt-3 font-medium text-pencil">
          {t('deleteFailed')}
        </p>
      )}
      <div className="mt-5 flex flex-wrap justify-end gap-3">
        <button ref={cancel} type="button" onClick={() => dialog.current?.close()} className={`${button} bg-cell text-ink`}>
          {t('cancel')}
        </button>
        <button type="button" onClick={deleteAccount} disabled={deleting} className={`${button} bg-ink text-paper`}>
          {t('delete')}
        </button>
      </div>
    </dialog>
  );
}
