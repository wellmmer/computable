'use client';

import { Download } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';
import { parseMachine } from '@/engines/turing';
import { downloadMachine } from '@/files/machine-file';
import { MACHINE_KEY } from '@/storage/keys';
import { sharedBrowserValues } from '@/storage/synced-key-value';
import type { MachineConflict } from './sync-engine';

const button = 'press border-2 border-ink px-3 py-1.5 font-semibold';

interface MachineChoiceDialogProps {
  conflict: MachineConflict;
  onKeepBrowser: () => void;
  onUseSaved: () => void;
}

/** The date and time in the page language, or null when the text is not a time. */
function formatTime(locale: string, changedAt: string | null): string | null {
  if (changedAt === null || Number.isNaN(Date.parse(changedAt))) return null;
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(changedAt));
}

/** One machine of the dialog: where it is, its name, and when it changed. */
function MachineRow({ id, label, name, time }: { id: string; label: string; name: string; time: string | null }) {
  const t = useTranslations('shell.account.machine');
  return (
    <div role="group" aria-labelledby={id} className="border-2 border-ink px-3 py-2">
      <p id={id} className="text-sm text-muted">
        {label}
      </p>
      <p className="font-semibold">{name}</p>
      {time !== null && <p className="text-sm">{t('changed', { time })}</p>}
    </div>
  );
}

/**
 * Asks which machine to keep, when both the browser's machine and the saved machine changed since
 * the last sync (spec R5b 5). Esc does not close it: the person must choose. Before that, the person
 * can download the browser's machine, with the same JSON file as "Download" in the simulator.
 */
export function MachineChoiceDialog({ conflict, onKeepBrowser, onUseSaved }: MachineChoiceDialogProps) {
  const t = useTranslations('shell.account.machine');
  const locale = useLocale();
  const dialog = useRef<HTMLDialogElement>(null);
  /** The answer, kept until the dialog has closed. */
  const answer = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (dialog.current?.open === false) dialog.current.showModal();
  }, []);

  const choose = (handler: () => void) => {
    answer.current = handler;
    dialog.current?.close();
  };

  const download = () => {
    const result = parseMachine(sharedBrowserValues().read(MACHINE_KEY) ?? '');
    if (result.ok) downloadMachine(result.machine);
  };

  return (
    <dialog
      ref={dialog}
      aria-labelledby="machine-choice-title"
      aria-describedby="machine-choice-text"
      onCancel={(event) => event.preventDefault()}
      onClose={() => answer.current?.()}
      className="m-auto w-[min(28rem,calc(100vw-2rem))] border-2 border-ink bg-cell p-5 text-ink backdrop:bg-ink/50"
    >
      <h2 id="machine-choice-title" className="font-display text-xl font-semibold">
        {t('title')}
      </h2>
      <p id="machine-choice-text" className="mt-3">
        {t('text')}
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <MachineRow
          id="machine-choice-browser"
          label={t('browser')}
          name={conflict.browser.name}
          time={formatTime(locale, conflict.browser.changedAt)}
        />
        <MachineRow id="machine-choice-saved" label={t('saved')} name={conflict.saved.name} time={formatTime(locale, conflict.saved.changedAt)} />
      </div>
      <div className="mt-5 flex flex-col gap-3">
        <button type="button" onClick={() => choose(onKeepBrowser)} className={`${button} bg-ink text-paper`}>
          {t('keepBrowser')}
        </button>
        <button type="button" onClick={() => choose(onUseSaved)} className={`${button} bg-ink text-paper`}>
          {t('useSaved')}
        </button>
      </div>
      <button
        type="button"
        onClick={download}
        className="mt-4 inline-flex items-center gap-1.5 font-medium underline decoration-1 underline-offset-4 hover:decoration-2"
      >
        <Download aria-hidden className="size-4 shrink-0" />
        {t('download')}
      </button>
    </dialog>
  );
}
