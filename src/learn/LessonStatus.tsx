'use client';

import { useTranslations } from 'next-intl';
import { useProgress } from './progress';

/**
 * "Not started" or "Quiz: 4 of 5" (spec 2.1). Results live only in the browser, so the server
 * renders nothing here and the status appears after hydration.
 */
export function LessonStatus({ slug }: { slug: string }) {
  const t = useTranslations('learn.page');
  const progress = useProgress();
  if (progress === null) return null;
  const result = progress[slug];
  return (
    <span className="border border-current px-2 py-0.5 font-medium">
      {result === undefined ? t('notStarted') : t('score', { best: result.best, total: result.total })}
    </span>
  );
}
