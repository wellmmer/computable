import { useLocale, useTranslations } from 'next-intl';
import { CC_BY_URL, TURING_1936_DOI_URL } from '@/config/links';
import { Link } from '@/i18n/navigation';
import { pageLead, pageMain, pageTitle, sectionTitle, textLink } from '@/shell/page-styles';
import { findLesson } from './lessons';
import { PAPER, type PaperBlock } from './paper';
import { PaperTape } from './PaperTape';

/** The soft hyphen that lets a long lesson title break on a phone. A short link line does not need it. */
const SOFT_HYPHEN = /\u00AD/g;

/** One part of the paper: its pages, title and summary, its quote with a translation, and its lessons. */
function PaperPartView({ block }: { block: PaperBlock }) {
  const t = useTranslations('learn.paper');
  const locale = useLocale();
  const titleId = `${block.id}-title`;
  const lessons = block.lessons.flatMap((slug) => {
    const found = findLesson(slug);
    return found === null ? [] : [{ slug, number: found.index + 1, title: found.lesson.text[locale].meta.title.replace(SOFT_HYPHEN, '') }];
  });
  return (
    // scroll-mt keeps a part's title below the sticky tape after a jump to #section-5.
    // The tape sticks only on a window at least 35rem tall (see PaperTape), so the margin does too.
    // The last part is at least half a window tall. The reading line is never above the middle of the
    // window, so the top of the last part can always reach it, even on a very tall screen.
    <section
      id={block.id}
      data-paper-part=""
      aria-labelledby={titleId}
      className="mt-10 border-t-2 border-ink pt-6 last:min-h-[50vh] [@media(min-height:35rem)]:scroll-mt-64"
    >
      <p className="text-sm font-semibold text-muted">{t('pages', { volume: block.volume, from: block.pages[0], to: block.pages[1] })}</p>
      <h2 id={titleId} className={`mt-1 ${sectionTitle} hyphens-auto break-words`}>
        {block.text.title}
      </h2>
      <p className="mt-3">{block.text.summary.join(' ')}</p>
      {block.quote !== null && (
        <figure className="mt-5 border-l-4 border-pencil pl-4">
          {/* Turing's words stay in English on every page, so screen readers read them in English. */}
          <blockquote lang="en" className="italic">
            <p>“{block.quote.text}”</p>
          </blockquote>
          {block.text.translation !== null && <p className="mt-3">{t('translation', { text: block.text.translation })}</p>}
          <figcaption className="mt-2 text-sm text-muted">{t('quotePage', { page: block.quote.page })}</figcaption>
        </figure>
      )}
      {lessons.length > 0 && (
        <div className="mt-5">
          <p className="text-sm font-semibold text-muted">{t('lessons')}</p>
          <ul className="mt-1 space-y-1">
            {lessons.map(({ slug, number, title }) => (
              <li key={slug}>
                <Link href={`/learn/${slug}`} className={textLink}>
                  {t('lessonLink', { number, title })}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      {block.link !== undefined && (
        <p className="mt-5">
          <a href={block.link} className={textLink}>
            {t('readCorrection')}
          </a>
        </p>
      )}
    </section>
  );
}

/**
 * The reading guide to Turing's 1936 paper (spec R2c 3): the DOI link and a note that the guide
 * quotes the paper and does not reproduce it, then one block per part under a tape that runs
 * Turing's first machine as the visitor reads.
 */
export function PaperGuide() {
  const t = useTranslations('learn.paper');
  const tLesson = useTranslations('learn.lesson');
  const locale = useLocale();
  return (
    <main className={pageMain}>
      <h1 className={`${pageTitle} hyphens-auto break-words`}>{t('title')}</h1>
      <p className={pageLead}>{t('lead')}</p>
      <p className="mt-4">
        {t.rich('source', {
          link: (chunks) => (
            <a href={TURING_1936_DOI_URL} className={`${textLink} break-all`}>
              {chunks}
            </a>
          ),
        })}
      </p>
      <p className="mt-4">{t('notice')}</p>
      <p className="mt-4 text-muted">{t('tapeIntro')}</p>

      {/* The tape and the parts share one parent: a sticky element only sticks inside its parent. */}
      <div className="mt-8 text-[17px]">
        <PaperTape />
        {PAPER[locale].map((block) => (
          <PaperPartView key={block.id} block={block} />
        ))}
      </div>

      <p className="mt-10 text-sm text-muted">
        {t.rich('license', {
          link: (chunks) => (
            <a href={CC_BY_URL} className={textLink}>
              {chunks}
            </a>
          ),
        })}
      </p>
      <p className="mt-8 border-t-2 border-ink pt-6">
        <Link href="/learn" className={textLink}>
          {tLesson('all')}
        </Link>
      </p>
    </main>
  );
}
