import { isLessonSlug } from '@/learn/lesson-slugs';

/** The public repo. The footer, About and Privacy link to it. */
export const REPO_URL = 'https://github.com/wellmmer/computable';

/** Questions and bug reports. */
export const ISSUES_URL = `${REPO_URL}/issues`;

/** The 2016 app's code, kept at a git tag (spec 4.1). */
export const TCC_TAG_URL = `${REPO_URL}/tree/v1.0-tcc-2016`;

/** The 2016 capstone paper, a PDF in Portuguese. */
export const TCC_PAPER_URL = `${REPO_URL}/blob/master/docs/tcc/paper/${encodeURIComponent(
  'TCC - Simulador de Máquina de Turing, Uma Aplicação Web para o Ensino.pdf',
)}`;

/** A lesson page, by its address without the language: /learn/intuition. */
const LESSON_PAGE = /^\/learn\/([^/]+)\/?$/;

/**
 * GitHub's page to edit the file that holds this page's text. For a visitor who cannot write to the
 * repo, GitHub forks it and opens a pull request (checked: GitHub Docs, "Editing files").
 * A lesson's text lives in its own file, content/lessons/<slug>/<locale>.mdx. Every other page reads
 * messages/<locale>.json. `pathname` is the address without the language, like /learn/intuition.
 */
export function translationEditUrl(locale: string, pathname: string): string {
  const lesson = LESSON_PAGE.exec(pathname);
  if (lesson !== null && isLessonSlug(lesson[1])) return `${REPO_URL}/edit/master/content/lessons/${lesson[1]}/${locale}.mdx`;
  return `${REPO_URL}/edit/master/messages/${locale}.json`;
}

/** The license of the lesson texts (spec 1, "License"). */
export const CC_BY_URL = 'https://creativecommons.org/licenses/by/4.0/';
