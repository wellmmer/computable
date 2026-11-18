/**
 * The slugs of the live lessons, in order. The proxy reads this list to answer 404 for an unknown
 * lesson, so this file must not import the lesson files (MDX). LESSONS in lessons.ts follows it.
 */
export const LESSON_SLUGS: readonly string[] = [
  'intuition',
  'formal-definition',
  'universal-machine',
  'halting-problem',
  'entscheidungsproblem',
  'church-turing',
];

/** True when a lesson has this slug. */
export function isLessonSlug(slug: string): boolean {
  return LESSON_SLUGS.includes(slug);
}
