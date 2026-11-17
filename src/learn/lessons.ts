import type { MDXContent } from 'mdx/types';
import type { Locale } from 'next-intl';
import { z } from 'zod';
import * as intuitionDe from '../../content/lessons/intuition/de.mdx';
import * as intuitionEn from '../../content/lessons/intuition/en.mdx';
import * as intuitionEs from '../../content/lessons/intuition/es.mdx';
import * as intuitionFr from '../../content/lessons/intuition/fr.mdx';
import * as intuitionPtBR from '../../content/lessons/intuition/pt-BR.mdx';
import { quiz as intuitionQuiz } from '../../content/lessons/intuition/quiz';
import intuitionQuizDe from '../../content/lessons/intuition/quiz.de.json';
import intuitionQuizEn from '../../content/lessons/intuition/quiz.en.json';
import intuitionQuizEs from '../../content/lessons/intuition/quiz.es.json';
import intuitionQuizFr from '../../content/lessons/intuition/quiz.fr.json';
import intuitionQuizPtBR from '../../content/lessons/intuition/quiz.pt-BR.json';
import { buildQuiz, type QuizKey, type QuizQuestion } from './quiz-data';

/** What each lesson file exports as `meta`: the Learn page and the page title read it (spec 3). */
export interface LessonMeta {
  title: string;
  summary: string;
  /** The reading time, in minutes. */
  minutes: number;
}

const metaSchema = z.strictObject({ title: z.string().min(1), summary: z.string().min(1), minutes: z.int().positive() });

/** A lesson in one language. */
export interface LessonText {
  Content: MDXContent;
  meta: LessonMeta;
  quiz: QuizQuestion[];
}

export interface Lesson {
  /** The English slug, the same in every language (spec 1): /pt-br/learn/intuition. */
  slug: string;
  text: Record<Locale, LessonText>;
}

/** An imported lesson file: the text as a component, and its meta. */
interface LessonFile {
  default: MDXContent;
  meta: unknown;
}

/** One language of a lesson: its file and its quiz texts. */
type LessonSource = [file: LessonFile, quizTexts: unknown];

function lessonText(slug: string, locale: Locale, [file, quizTexts]: LessonSource, key: QuizKey): LessonText {
  const meta = metaSchema.safeParse(file.meta);
  if (!meta.success) {
    throw new Error(`content/lessons/${slug}/${locale}.mdx: meta.${meta.error.issues.map((issue) => issue.path.join('.')).join(', meta.')}`);
  }
  return { Content: file.default, meta: meta.data, quiz: buildQuiz(key, quizTexts, `content/lessons/${slug}/quiz.${locale}.json`) };
}

/**
 * Checks every language of a lesson when the app builds. A language missing from `sources` fails the
 * type check, and a broken meta or quiz text throws, so `next build` fails (spec 3).
 */
function lesson(slug: string, key: QuizKey, sources: Record<Locale, LessonSource>): Lesson {
  return {
    slug,
    text: {
      en: lessonText(slug, 'en', sources.en, key),
      'pt-BR': lessonText(slug, 'pt-BR', sources['pt-BR'], key),
      es: lessonText(slug, 'es', sources.es, key),
      fr: lessonText(slug, 'fr', sources.fr, key),
      de: lessonText(slug, 'de', sources.de, key),
    },
  };
}

/** The live lessons, in order (spec 2.1). Their slugs match LESSON_SLUGS in lesson-slugs.ts, which the proxy reads. */
export const LESSONS: readonly Lesson[] = [
  lesson('intuition', intuitionQuiz, {
    en: [intuitionEn, intuitionQuizEn],
    'pt-BR': [intuitionPtBR, intuitionQuizPtBR],
    es: [intuitionEs, intuitionQuizEs],
    fr: [intuitionFr, intuitionQuizFr],
    de: [intuitionDe, intuitionQuizDe],
  }),
];

/** The lesson with this slug and its place in LESSONS, or null. */
export function findLesson(slug: string): { lesson: Lesson; index: number } | null {
  const index = LESSONS.findIndex((candidate) => candidate.slug === slug);
  return index === -1 ? null : { lesson: LESSONS[index], index };
}
