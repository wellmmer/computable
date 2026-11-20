'use client';

import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
import { isLetter, type Letter } from '@/engines/enigma';
import { groupsOf5 } from '@/enigma/lab-state';
import { Lampboard } from '@/enigma/Lampboard';
import { encryptSecret, HOME_SETTINGS, HOME_START } from './secret';
import { forgetSecret, saveSecret, useSecret } from './use-secret';

const strip = 'min-h-11 border border-soft bg-cell px-2.5 py-2 font-mono text-[17px] font-medium tracking-[2px] [word-spacing:6px] break-words';

/**
 * "Type your own secret" (spec R3 4): a small Enigma on Home. The text, its secret letters and the
 * settings stay in this browser only. The settings are the lab's first settings, so the lab decrypts
 * the secret letters without changes.
 */
export function HomeSecret() {
  const t = useTranslations('home.secret');
  const tLab = useTranslations('enigma.lab');
  const secret = useSecret();
  const plain = secret?.plain ?? '';
  const { letters, cipher } = encryptSecret(plain);
  const lamp = cipher.at(-1);
  const lit = lamp !== undefined && isLetter(lamp) ? lamp : null;
  const { rotors, rings, plugs, reflector } = HOME_SETTINGS;
  const textField = useRef<HTMLTextAreaElement>(null);
  // What the live region says. Only typing sets it, so a saved secret is not read aloud on page load. `id` makes it speak again.
  const [news, setNews] = useState<{ id: number; kind: 'lit' | 'removed'; letter: Letter } | null>(null);

  const type = (text: string) => {
    const next = encryptSecret(text);
    const id = (news?.id ?? 0) + 1;
    const lastLamp = next.cipher.at(-1);
    const removed = letters.at(-1);
    if (next.letters.length > letters.length && lastLamp !== undefined && isLetter(lastLamp)) setNews({ id, kind: 'lit', letter: lastLamp });
    else if (next.letters.length < letters.length && removed !== undefined && isLetter(removed)) setNews({ id, kind: 'removed', letter: removed });
    else setNews(null);
    saveSecret(text);
  };

  // "Forget my secret" turns itself off, so the focus would drop to the page. It goes to the empty text field instead.
  const forget = () => {
    forgetSecret();
    setNews(null);
    textField.current?.focus();
  };

  return (
    <section aria-labelledby="secret-title" className="mx-auto max-w-[720px] px-4">
      <h2 id="secret-title" className="font-display text-[28px]/tight font-semibold sm:text-[32px]/tight">
        {t('title')}
      </h2>
      <p className="mt-2 text-lg/snug">{t('lead')}</p>

      <div className="mt-4 rounded-[10px] bg-bakelite px-3 py-3.5 sm:px-4">
        <label htmlFor="secret-text" className="text-sm font-semibold text-brass">
          {t('label')}
        </label>
        <textarea
          ref={textField}
          id="secret-text"
          value={plain}
          onChange={(event) => type(event.target.value)}
          // Until the page has read the saved secret, React would erase what the visitor types. So the field waits.
          readOnly={secret === undefined}
          rows={2}
          maxLength={250}
          spellCheck={false}
          className="mt-1 block w-full resize-y rounded-[3px] border-2 border-brass bg-ivory px-2.5 py-1.5 font-mono text-lg text-bakelite focus-visible:outline-lamp!"
        />
        <div className="mt-3">
          <Lampboard lit={lit} />
        </div>
      </div>

      <dl className="mt-3 space-y-2">
        <div>
          <dt className="mb-1 text-sm font-semibold">{t('typed')}</dt>
          <dd data-strip className={strip}>
            {groupsOf5(letters)}
          </dd>
        </div>
        <div>
          <dt className="mb-1 text-sm font-semibold">{t('cipher')}</dt>
          <dd data-strip className={`${strip} border-l-4 border-l-lamp`}>
            {groupsOf5(cipher)}
          </dd>
        </div>
      </dl>
      <p className="mt-2 text-sm text-muted">{t('rules')}</p>
      <p className="mt-2 text-sm text-muted">
        {t('settings', { rotors: rotors.join(' '), rings: rings.join(' '), plugs: plugs.join(' '), reflector, start: HOME_START.join(' ') })}
      </p>
      <p className="mt-2 text-sm">{t('decrypt')}</p>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <button
          type="button"
          onClick={forget}
          disabled={!secret}
          className="press border-2 border-ink bg-cell px-3 py-1.5 font-semibold text-ink disabled:opacity-50"
        >
          {t('forget')}
        </button>
        <p className="text-sm text-muted">{t('stays')}</p>
      </div>
      <p role="status" className="sr-only">
        {news !== null && <span key={news.id}>{news.kind === 'lit' ? t('litNews', { letter: news.letter }) : tLab('removedNews', { letter: news.letter })}</span>}
      </p>
    </section>
  );
}
