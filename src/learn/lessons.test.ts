import { describe, expect, it } from 'vitest';
import { routing } from '@/i18n/routing';
import { LESSON_SLUGS } from './lesson-slugs';
import { findLesson, LESSONS } from './lessons';

describe('LESSONS (spec 3)', () => {
  it('lists the live lessons in order: lesson 1 only, until R2a-2 adds lesson 2', () => {
    expect(LESSONS.map((lesson) => lesson.slug)).toEqual(['intuition']);
  });

  it('has the same slugs, in the same order, as the list the proxy reads', () => {
    expect(LESSONS.map((lesson) => lesson.slug)).toEqual(LESSON_SLUGS);
  });

  it.each(routing.locales)('has the title, summary and reading time of every lesson in %s', (locale) => {
    for (const lesson of LESSONS) {
      const { meta } = lesson.text[locale];
      expect(meta.title.length, lesson.slug).toBeGreaterThan(0);
      expect(meta.summary.length, lesson.slug).toBeGreaterThan(0);
      expect(meta.minutes, lesson.slug).toBe(lesson.text.en.meta.minutes);
    }
  });

  it('reads the English meta of lesson 1', () => {
    expect(LESSONS[0].text.en.meta).toEqual({
      title: 'Intuition: the human computer',
      summary: 'How Turing turned a person who computes with a pencil into a machine with a tape, a head, states and rules.',
      minutes: 7,
    });
  });

  it.each(routing.locales)('gives the quiz in %s the same questions and right answers as in English', (locale) => {
    for (const lesson of LESSONS) {
      const answers = (questions: typeof lesson.text.en.quiz) => questions.map(({ id, answer, options }) => [id, answer, options.map((option) => option.id)]);
      expect(answers(lesson.text[locale].quiz)).toEqual(answers(lesson.text.en.quiz));
    }
  });
});

describe('findLesson', () => {
  it('finds a lesson and its place in the list', () => {
    expect(findLesson('intuition')).toEqual({ lesson: LESSONS[0], index: 0 });
  });

  it('finds nothing for an unknown slug', () => {
    expect(findLesson('halting-problem')).toBeNull();
  });
});
