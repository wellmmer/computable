import { useTranslations } from 'next-intl';
import { textLink } from '@/shell/page-styles';
import { FILM_SOURCES, HISTORY, type Source } from './history';

const card = 'border border-soft bg-cell px-4 py-4 sm:rounded';

/** "Sources" and the links, as under the real messages of the Enigma lab. */
function Sources({ sources }: { sources: readonly Source[] }) {
  const t = useTranslations('bombe.history');
  return (
    <>
      <p className="mt-3 text-sm font-semibold">{t('sources')}</p>
      <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
        {sources.map(({ name, url }) => (
          <li key={url}>
            <a href={url} className={textLink}>
              {name}
            </a>
          </li>
        ))}
      </ul>
    </>
  );
}

/**
 * The history under the Bombe lab (spec R4 5), in the same place as the messages under the Enigma
 * lab. Five facts in the order they happened, each with its sources, then the film box. The film
 * box has text and links only: no stills or posters.
 */
export function BombeHistory() {
  const t = useTranslations('bombe.history');
  return (
    <section aria-labelledby="history-title" className="mt-10">
      <h2 id="history-title" className="font-display text-2xl/tight font-semibold">
        {t('title')}
      </h2>
      <p className="mt-2">{t('lead')}</p>
      <ol className="mt-4 grid gap-4 md:grid-cols-2">
        {HISTORY.map(({ id, sources }) => (
          <li key={id} className={card}>
            <h3 className="font-semibold">{t(`facts.${id}.title`)}</h3>
            <p className="mt-1">{t(`facts.${id}.text`)}</p>
            <Sources sources={sources} />
          </li>
        ))}
      </ol>
      <div className={`mt-4 ${card}`}>
        <h3 className="font-semibold">{t('film.title')}</h3>
        <p className="mt-1">{t('film.text')}</p>
        <p className="mt-1">{t('film.changes')}</p>
        <Sources sources={FILM_SOURCES} />
      </div>
    </section>
  );
}
