import type { MDXContent } from 'mdx/types';
import type { Locale } from 'next-intl';
import { z } from 'zod';
import * as churchTuringDe from '../../content/lessons/church-turing/de.mdx';
import * as churchTuringEn from '../../content/lessons/church-turing/en.mdx';
import * as churchTuringEs from '../../content/lessons/church-turing/es.mdx';
import * as churchTuringFr from '../../content/lessons/church-turing/fr.mdx';
import * as churchTuringPtBR from '../../content/lessons/church-turing/pt-BR.mdx';
import { quiz as churchTuringQuiz } from '../../content/lessons/church-turing/quiz';
import churchTuringQuizDe from '../../content/lessons/church-turing/quiz.de.json';
import churchTuringQuizEn from '../../content/lessons/church-turing/quiz.en.json';
import churchTuringQuizEs from '../../content/lessons/church-turing/quiz.es.json';
import churchTuringQuizFr from '../../content/lessons/church-turing/quiz.fr.json';
import churchTuringQuizPtBR from '../../content/lessons/church-turing/quiz.pt-BR.json';
import * as entscheidungsproblemDe from '../../content/lessons/entscheidungsproblem/de.mdx';
import * as entscheidungsproblemEn from '../../content/lessons/entscheidungsproblem/en.mdx';
import * as entscheidungsproblemEs from '../../content/lessons/entscheidungsproblem/es.mdx';
import * as entscheidungsproblemFr from '../../content/lessons/entscheidungsproblem/fr.mdx';
import * as entscheidungsproblemPtBR from '../../content/lessons/entscheidungsproblem/pt-BR.mdx';
import { quiz as entscheidungsproblemQuiz } from '../../content/lessons/entscheidungsproblem/quiz';
import entscheidungsproblemQuizDe from '../../content/lessons/entscheidungsproblem/quiz.de.json';
import entscheidungsproblemQuizEn from '../../content/lessons/entscheidungsproblem/quiz.en.json';
import entscheidungsproblemQuizEs from '../../content/lessons/entscheidungsproblem/quiz.es.json';
import entscheidungsproblemQuizFr from '../../content/lessons/entscheidungsproblem/quiz.fr.json';
import entscheidungsproblemQuizPtBR from '../../content/lessons/entscheidungsproblem/quiz.pt-BR.json';
import * as formalDefinitionDe from '../../content/lessons/formal-definition/de.mdx';
import * as formalDefinitionEn from '../../content/lessons/formal-definition/en.mdx';
import * as formalDefinitionEs from '../../content/lessons/formal-definition/es.mdx';
import * as formalDefinitionFr from '../../content/lessons/formal-definition/fr.mdx';
import * as formalDefinitionPtBR from '../../content/lessons/formal-definition/pt-BR.mdx';
import { quiz as formalDefinitionQuiz } from '../../content/lessons/formal-definition/quiz';
import formalDefinitionQuizDe from '../../content/lessons/formal-definition/quiz.de.json';
import formalDefinitionQuizEn from '../../content/lessons/formal-definition/quiz.en.json';
import formalDefinitionQuizEs from '../../content/lessons/formal-definition/quiz.es.json';
import formalDefinitionQuizFr from '../../content/lessons/formal-definition/quiz.fr.json';
import formalDefinitionQuizPtBR from '../../content/lessons/formal-definition/quiz.pt-BR.json';
import * as haltingProblemDe from '../../content/lessons/halting-problem/de.mdx';
import * as haltingProblemEn from '../../content/lessons/halting-problem/en.mdx';
import * as haltingProblemEs from '../../content/lessons/halting-problem/es.mdx';
import * as haltingProblemFr from '../../content/lessons/halting-problem/fr.mdx';
import * as haltingProblemPtBR from '../../content/lessons/halting-problem/pt-BR.mdx';
import { quiz as haltingProblemQuiz } from '../../content/lessons/halting-problem/quiz';
import haltingProblemQuizDe from '../../content/lessons/halting-problem/quiz.de.json';
import haltingProblemQuizEn from '../../content/lessons/halting-problem/quiz.en.json';
import haltingProblemQuizEs from '../../content/lessons/halting-problem/quiz.es.json';
import haltingProblemQuizFr from '../../content/lessons/halting-problem/quiz.fr.json';
import haltingProblemQuizPtBR from '../../content/lessons/halting-problem/quiz.pt-BR.json';
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
import * as universalMachineDe from '../../content/lessons/universal-machine/de.mdx';
import * as universalMachineEn from '../../content/lessons/universal-machine/en.mdx';
import * as universalMachineEs from '../../content/lessons/universal-machine/es.mdx';
import * as universalMachineFr from '../../content/lessons/universal-machine/fr.mdx';
import * as universalMachinePtBR from '../../content/lessons/universal-machine/pt-BR.mdx';
import { quiz as universalMachineQuiz } from '../../content/lessons/universal-machine/quiz';
import universalMachineQuizDe from '../../content/lessons/universal-machine/quiz.de.json';
import universalMachineQuizEn from '../../content/lessons/universal-machine/quiz.en.json';
import universalMachineQuizEs from '../../content/lessons/universal-machine/quiz.es.json';
import universalMachineQuizFr from '../../content/lessons/universal-machine/quiz.fr.json';
import universalMachineQuizPtBR from '../../content/lessons/universal-machine/quiz.pt-BR.json';
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
  lesson('formal-definition', formalDefinitionQuiz, {
    en: [formalDefinitionEn, formalDefinitionQuizEn],
    'pt-BR': [formalDefinitionPtBR, formalDefinitionQuizPtBR],
    es: [formalDefinitionEs, formalDefinitionQuizEs],
    fr: [formalDefinitionFr, formalDefinitionQuizFr],
    de: [formalDefinitionDe, formalDefinitionQuizDe],
  }),
  lesson('universal-machine', universalMachineQuiz, {
    en: [universalMachineEn, universalMachineQuizEn],
    'pt-BR': [universalMachinePtBR, universalMachineQuizPtBR],
    es: [universalMachineEs, universalMachineQuizEs],
    fr: [universalMachineFr, universalMachineQuizFr],
    de: [universalMachineDe, universalMachineQuizDe],
  }),
  lesson('halting-problem', haltingProblemQuiz, {
    en: [haltingProblemEn, haltingProblemQuizEn],
    'pt-BR': [haltingProblemPtBR, haltingProblemQuizPtBR],
    es: [haltingProblemEs, haltingProblemQuizEs],
    fr: [haltingProblemFr, haltingProblemQuizFr],
    de: [haltingProblemDe, haltingProblemQuizDe],
  }),
  lesson('entscheidungsproblem', entscheidungsproblemQuiz, {
    en: [entscheidungsproblemEn, entscheidungsproblemQuizEn],
    'pt-BR': [entscheidungsproblemPtBR, entscheidungsproblemQuizPtBR],
    es: [entscheidungsproblemEs, entscheidungsproblemQuizEs],
    fr: [entscheidungsproblemFr, entscheidungsproblemQuizFr],
    de: [entscheidungsproblemDe, entscheidungsproblemQuizDe],
  }),
  lesson('church-turing', churchTuringQuiz, {
    en: [churchTuringEn, churchTuringQuizEn],
    'pt-BR': [churchTuringPtBR, churchTuringQuizPtBR],
    es: [churchTuringEs, churchTuringQuizEs],
    fr: [churchTuringFr, churchTuringQuizFr],
    de: [churchTuringDe, churchTuringQuizDe],
  }),
];

/** The lesson with this slug and its place in LESSONS, or null. */
export function findLesson(slug: string): { lesson: Lesson; index: number } | null {
  const index = LESSONS.findIndex((candidate) => candidate.slug === slug);
  return index === -1 ? null : { lesson: LESSONS[index], index };
}
