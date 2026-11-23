'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Fragment } from 'react';
import { isM4, type MachineSettings, type Positions } from '@/engines/enigma';
import { textLink } from '@/shell/page-styles';
import type { KeySheet } from './key-sheet';
import { ringsText, rotorsText, startText } from './machine-facts';
import { practiceM4Message, practiceMessages } from './practice-messages';
import { REAL_MESSAGES } from './real-messages';

/** A message the visitor loaded into the machine, with the name the "Decrypting" box shows. */
export interface LoadedMessage {
  title: string;
  /** The key sheet. Its answer is null when nobody knows the plain text yet, as for a Bombe stop. */
  sheet: Omit<KeySheet, 'answer'> & { answer: string | null };
}

const PRACTICE_TITLES = ['practice1', 'practice2', 'practice3'] as const;

/** One practice key sheet as a card, with its button. */
function PracticeCard({ id, title, sheet, load, onLoad }: { id: string; title: string; sheet: KeySheet; load: string; onLoad: MessageListProps['onLoad'] }) {
  const t = useTranslations('enigma.messages');
  return (
    <article aria-labelledby={id} className={card}>
      <h4 id={id} className="font-semibold">
        {title}
      </h4>
      <Facts settings={sheet.settings} start={sheet.start} />
      <p className={label}>{t('secret')}</p>
      <p className={letterGroups}>{sheet.cipher}</p>
      <LoadButton text={load} title={title} onClick={(button) => onLoad({ title, sheet }, button)} />
    </article>
  );
}

const card = 'border border-soft bg-cell px-4 py-4 sm:rounded';
const label = 'mt-3 text-sm font-semibold';
/** Secret letters and published plain texts: monospace, so the groups line up. */
export const letterGroups = 'font-mono text-[15px] font-medium tracking-[1.5px] [word-spacing:4px] break-words';

/** The settings of a key sheet, and its start, as a list of terms. The M4's thin rotor comes first. */
function Facts({ settings, start }: { settings: MachineSettings; start?: Positions }) {
  const t = useTranslations('enigma.settings');
  const tMessages = useTranslations('enigma.messages');
  const facts = [
    [t('rotors'), rotorsText(settings)],
    [t('rings'), ringsText(settings)],
    [t('plugs'), settings.plugs.length === 0 ? t('noPlugs') : settings.plugs.join(' ')],
    [t('reflector'), isM4(settings) ? t('thinReflector', { name: settings.reflector }) : settings.reflector],
  ];
  if (start !== undefined) facts.push([tMessages('start'), startText(settings, start)]);
  return (
    <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-sm">
      {facts.map(([term, value]) => (
        <Fragment key={term}>
          <dt className="text-muted">{term}</dt>
          <dd className="font-mono font-semibold">{value}</dd>
        </Fragment>
      ))}
    </dl>
  );
}

/** "Load into the machine", with the message's name for screen readers: 6 buttons on the page say the same. */
function LoadButton({ text, title, onClick }: { text: string; title: string; onClick: (button: HTMLButtonElement) => void }) {
  return (
    <button type="button" aria-label={`${text}: ${title}`} onClick={(event) => onClick(event.currentTarget)} className="press mt-3 border-2 border-ink bg-ink px-3 py-1.5 font-semibold text-paper">
      {text}
    </button>
  );
}

interface MessageListProps {
  onLoad: (message: LoadedMessage, button: HTMLButtonElement) => void;
}

/**
 * The messages under the lab (spec R3 4): 3 practice messages in the visitor's language, practice 4
 * for the naval M4 (spec R5a 3), then the real messages with their sources. U-264 runs on the M4 (spec R5a 4). "Load into the machine" hands a key sheet to the lab, with
 * the button that was pressed, so the focus can go back to it.
 */
export function MessageList({ onLoad }: MessageListProps) {
  const t = useTranslations('enigma.messages');
  const locale = useLocale();

  return (
    <section aria-labelledby="messages-title" className="mt-10">
      <h2 id="messages-title" className="font-display text-2xl/tight font-semibold">
        {t('title')}
      </h2>
      <p className="mt-2">{t('lead')}</p>
      <p className="mt-1 text-sm text-muted">{t('spaces')}</p>

      <h3 className="mt-6 text-lg font-semibold">{t('practice')}</h3>
      <div className="mt-2 grid gap-4 md:grid-cols-2">
        {practiceMessages(locale).map((sheet, i) => (
          <PracticeCard key={PRACTICE_TITLES[i]} id={`practice-${i + 1}`} title={t(PRACTICE_TITLES[i])} sheet={sheet} load={t('load')} onLoad={onLoad} />
        ))}
        <PracticeCard id="practice-4" title={t('practiceM4')} sheet={practiceM4Message(locale)} load={t('load')} onLoad={onLoad} />
      </div>

      <h3 className="mt-8 text-lg font-semibold">{t('real')}</h3>
      {REAL_MESSAGES.map(({ id, parts, readable, sources }) => {
        const title = t(`${id}.title`);
        return (
          <article key={id} aria-labelledby={`${id}-title`} className={`mt-2 mb-4 ${card}`}>
            <h4 id={`${id}-title`} className="font-semibold">
              {title}
            </h4>
            <p className="mt-1">{t(`${id}.about`)}</p>
            {id === 'u264' && <p className="mt-1">{t('u264.rings')}</p>}
            <Facts settings={parts[0].settings} />
            {parts.map((part, i) => {
              const partTitle = parts.length === 1 ? title : t('titlePart', { title, part: i + 1 });
              return (
                <div key={i} className="mt-4 border-t border-soft pt-3">
                  {parts.length > 1 && <p className="font-semibold">{t('part', { part: i + 1 })}</p>}
                  <p className="text-sm">
                    <span className="text-muted">{t('start')}</span> <span className="font-mono font-semibold">{startText(part.settings, part.start)}</span>
                  </p>
                  {part.hiddenStart !== null && (
                    <p className="text-sm text-muted">
                      {t('hiddenStart', { from: part.hiddenStart.from.join(' '), typed: [...part.hiddenStart.typed].join(' '), start: part.start.join(' ') })}
                    </p>
                  )}
                  <p className={label}>{t('secret')}</p>
                  {part.keyGroup !== null && <p className="text-sm text-muted">{t('keyGroup', { group: part.keyGroup })}</p>}
                  <p className={letterGroups}>{part.cipher}</p>
                  <LoadButton
                    text={parts.length === 1 ? t('load') : t('loadPart', { part: i + 1 })}
                    title={title}
                    onClick={(button) => onLoad({ title: partTitle, sheet: part }, button)}
                  />
                </div>
              );
            })}
            <details className="mt-4 border-t border-soft pt-3">
              <summary className="cursor-pointer font-semibold">{t('whatItSays')}</summary>
              <p className={label}>{t('asPublished')}</p>
              {parts.map((part, i) => (
                <p key={i} lang="de" className={`mt-1 ${letterGroups}`}>
                  {part.published}
                </p>
              ))}
              <p className="mt-1 text-sm text-muted">{t(`${id}.rules`)}</p>
              <p className={label}>{t('readable')}</p>
              <p lang="de">{readable}</p>
              <p className={label}>{t('translation')}</p>
              <p>{t(`${id}.text`)}</p>
            </details>
            <p className={label}>{t('sources')}</p>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
              {sources.map(({ name, url }) => (
                <li key={url}>
                  <a href={url} className={textLink}>
                    {name}
                  </a>
                </li>
              ))}
            </ul>
          </article>
        );
      })}
    </section>
  );
}
