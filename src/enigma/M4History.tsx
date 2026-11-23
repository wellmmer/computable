import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { textLink } from '@/shell/page-styles';
import { M4_HISTORY } from './m4-history';

const card = 'border border-soft bg-cell px-4 py-4 sm:rounded';

/**
 * The history of the M4 under the Enigma lab (spec R5a 4), in the style of the Bombe history.
 * Four facts in the order they happened, each with its sources. The last one links to the Bombe lab.
 */
export function M4History() {
  const t = useTranslations('enigma.history');
  return (
    <section aria-labelledby="m4-history-title" className="mt-10">
      <h2 id="m4-history-title" className="font-display text-2xl/tight font-semibold">
        {t('title')}
      </h2>
      <p className="mt-2">{t('lead')}</p>
      <ol className="mt-4 grid gap-4 md:grid-cols-2">
        {M4_HISTORY.map(({ id, sources }) => (
          <li key={id} className={card}>
            <h3 className="font-semibold">{t(`facts.${id}.title`)}</h3>
            <p className="mt-1">{t(`facts.${id}.text`)}</p>
            {id === 'here' && (
              <p className="mt-1">
                <Link href="/bombe" className={textLink}>
                  {t('bombeLink')}
                </Link>
              </p>
            )}
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
          </li>
        ))}
      </ol>
    </section>
  );
}
