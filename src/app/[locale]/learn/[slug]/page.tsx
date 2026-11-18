import type { Metadata } from 'next';
import { getLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { findLesson, LESSONS } from '@/learn/lessons';
import { LessonView } from '@/learn/LessonView';

/** Every lesson in every language is built ahead: the layout gives the 5 languages (spec 3). */
export function generateStaticParams() {
  return LESSONS.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<'/[locale]/learn/[slug]'>): Promise<Metadata> {
  const found = findLesson((await params).slug);
  if (found === null) return {};
  // The soft hyphen in a title only helps the heading break on a phone. The tab title needs none.
  return { title: found.lesson.text[await getLocale()].meta.title.replaceAll('\u00AD', '') };
}

export default async function LessonPage({ params }: PageProps<'/[locale]/learn/[slug]'>) {
  const found = findLesson((await params).slug);
  if (found === null) notFound();
  return <LessonView lessons={LESSONS} index={found.index} />;
}
