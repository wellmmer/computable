import { describe, expect, it } from 'vitest';
import { routing } from '@/i18n/routing';
import { LESSON_SLUGS } from './lesson-slugs';
import { findLesson, LESSONS } from './lessons';

describe('LESSONS (spec 3)', () => {
  it('lists the 6 live lessons in Turing’s order (spec R2b 1)', () => {
    expect(LESSONS.map((lesson) => lesson.slug)).toEqual(['intuition', 'formal-definition', 'universal-machine', 'halting-problem', 'entscheidungsproblem', 'church-turing']);
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

  it('reads the English meta of lesson 2', () => {
    expect(LESSONS[1].text.en.meta).toEqual({
      title: 'The formal definition',
      summary: 'The seven parts of a Turing machine in Sipser’s textbook, and where you find each part in this simulator.',
      minutes: 7,
    });
  });

  it('reads the English meta of lesson 3', () => {
    expect(LESSONS[2].text.en.meta).toEqual({
      title: 'The universal machine',
      summary: 'How Turing wrote a whole machine as one line of letters, and described one machine that can do the work of any other.',
      minutes: 6,
    });
  });

  it('reads the English meta of lesson 4', () => {
    expect(LESSONS[3].text.en.meta).toEqual({
      title: 'The halting problem',
      summary: 'Why no machine can tell, for every machine and input, whether it will stop. The diagonal argument step by step, and what Turing himself proved.',
      minutes: 7,
    });
  });

  it('reads the English meta of lesson 5', () => {
    expect(LESSONS[4].text.en.meta).toEqual({
      title: 'The Entscheidungsproblem',
      summary: 'Is there one method that decides, for every formula of logic, whether it can be proved? How Church and Turing answered no in 1936, and how Turing used the “ever prints 0” result.',
      minutes: 6,
    });
  });

  it('reads the English meta of lesson 6', () => {
    expect(LESSONS[5].text.en.meta).toEqual({
      title: 'The Church–Turing thesis',
      summary: 'What a person can compute by following a fixed method, a Turing machine can compute. Why this is a thesis and not a theorem, and how Turing showed that his idea and Church’s agree.',
      minutes: 6,
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
    expect(findLesson('formal-definition')).toEqual({ lesson: LESSONS[1], index: 1 });
    expect(findLesson('universal-machine')).toEqual({ lesson: LESSONS[2], index: 2 });
    expect(findLesson('halting-problem')).toEqual({ lesson: LESSONS[3], index: 3 });
    expect(findLesson('entscheidungsproblem')).toEqual({ lesson: LESSONS[4], index: 4 });
    expect(findLesson('church-turing')).toEqual({ lesson: LESSONS[5], index: 5 });
  });

  it('finds nothing for an unknown slug', () => {
    expect(findLesson('no-such-lesson')).toBeNull();
  });
});
