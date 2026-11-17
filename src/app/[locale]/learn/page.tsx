import type { Metadata } from 'next';
import { useLocale, useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { LessonStatus } from '@/learn/LessonStatus';
import { LESSONS } from '@/learn/lessons';
import { ResetProgress } from '@/learn/ResetProgress';
import { pageLead, pageMain, pageTitle, sectionTitle, sheet, textLink } from '@/shell/page-styles';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('learn.page');
  return { title: t('pageTitle') };
}

/** Learn (spec 2.1): the live lessons in order, each with its quiz status, the reading guide, and a way to reset the progress. */
export default function LearnPage() {
  const t = useTranslations('learn.page');
  const locale = useLocale();
  return (
    <main className={pageMain}>
      <h1 className={pageTitle}>{t('title')}</h1>
      <p className={pageLead}>{t('lead')}</p>

      <ol className="mt-10 space-y-5">
        {LESSONS.map((lesson, index) => {
          const { meta } = lesson.text[locale];
          return (
            <li key={lesson.slug} className={`border-t-4 border-pencil ${sheet}`}>
              <p className="text-sm font-semibold text-muted">{t('lesson', { number: index + 1 })}</p>
              <h2 className={`mt-1 ${sectionTitle}`}>
                <Link href={`/learn/${lesson.slug}`} className={textLink}>
                  {meta.title}
                </Link>
              </h2>
              <p className="mt-3">{meta.summary}</p>
              <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted">
                <span>{t('minutes', { minutes: meta.minutes })}</span>
                <LessonStatus slug={lesson.slug} />
              </p>
            </li>
          );
        })}
      </ol>

      {/* The reading guide is not a lesson: no number, no reading time, no quiz status (spec R2c 3). */}
      <section aria-labelledby="paper-guide" className={`mt-5 border-t-4 border-ink ${sheet}`}>
        <p className="text-sm font-semibold text-muted">{t('guide')}</p>
        <h2 id="paper-guide" className={`mt-1 ${sectionTitle}`}>
          <Link href="/learn/paper" className={textLink}>
            {t('guideTitle')}
          </Link>
        </h2>
        <p className="mt-3">{t('guideSummary')}</p>
      </section>

      <ResetProgress />
    </main>
  );
}
