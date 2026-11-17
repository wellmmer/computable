import { useLocale, useTranslations } from 'next-intl';
import { CC_BY_URL } from '@/config/links';
import { Link } from '@/i18n/navigation';
import { pageMain, pageTitle, textLink } from '@/shell/page-styles';
import { LessonEncoding } from './LessonEncoding';
import { LessonMachine } from './LessonMachine';
import type { Lesson } from './lessons';
import { Quiz } from './Quiz';

/**
 * A lesson (spec 2.2): its place in the list, the title and the reading time, then the text with
 * its machines and quiz. The text ends with its sources; the license note and the links to the
 * other lessons follow.
 */
export function LessonView({ lessons, index }: { lessons: readonly Lesson[]; index: number }) {
  const t = useTranslations('learn.lesson');
  const tPage = useTranslations('learn.page');
  const locale = useLocale();
  const lesson = lessons[index];
  const { Content, meta, quiz } = lesson.text[locale];
  const previous = index > 0 ? lessons[index - 1] : undefined;
  const next = index < lessons.length - 1 ? lessons[index + 1] : undefined;

  return (
    <main className={pageMain}>
      <p className="text-sm font-semibold text-muted">{t('position', { number: index + 1, total: lessons.length })}</p>
      {/* A long word such as "Entscheidungsproblem" is wider than a phone at 40 px: let it break. */}
      <h1 className={`mt-2 ${pageTitle} hyphens-auto break-words`}>{meta.title}</h1>
      <p className="mt-3 text-muted">{tPage('minutes', { minutes: meta.minutes })}</p>

      {/* About 68 characters per line: `ch` follows the 17 px text size set here. */}
      <div className="mt-8 max-w-[68ch] text-[17px]">
        <Content components={{ Machine: LessonMachine, Encoding: LessonEncoding, Quiz: () => <Quiz slug={lesson.slug} questions={quiz} /> }} />
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

      <nav aria-label={t('nav')} className="mt-8 flex flex-wrap justify-between gap-x-6 gap-y-3 border-t-2 border-ink pt-6">
        {previous !== undefined && (
          <Link href={`/learn/${previous.slug}`} className={textLink}>
            {t('previous', { title: previous.text[locale].meta.title })}
          </Link>
        )}
        <Link href="/learn" className={textLink}>
          {t('all')}
        </Link>
        {next !== undefined && (
          <Link href={`/learn/${next.slug}`} className={textLink}>
            {t('next', { title: next.text[locale].meta.title })}
          </Link>
        )}
      </nav>
    </main>
  );
}
