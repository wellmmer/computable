// @vitest-environment jsdom
/// <reference types="vite/client" />
import type { MDXContent } from 'mdx/types';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { EXAMPLE_IDS, type ExampleId } from '@/simulator/examples';
import { buildQuiz, type QuizKey } from './quiz-data';

// Every lesson file, found by path, so a new lesson or language is checked without a change here.
const mdxFiles = import.meta.glob<{ default: MDXContent }>('../../content/lessons/*/*.mdx', { eager: true });
const quizKeys = import.meta.glob<{ quiz: QuizKey }>('../../content/lessons/*/quiz.ts', { eager: true });
const quizTexts = import.meta.glob<unknown>('../../content/lessons/*/quiz.*.json', { eager: true, import: 'default' });

/** "../../content/lessons/intuition/en.mdx" → ["intuition", "en"]. */
function lessonAndName(path: string): [string, string] {
  const [lesson, file] = path.split('/').slice(-2);
  return [lesson, file.replace(/\.(mdx|ts|json)$/, '')];
}

/** The tags that markdown makes from headings, paragraphs, quotes, lists, links and emphasis (spec 3). */
const MARKDOWN_TAGS = ['h2', 'h3', 'p', 'blockquote', 'ul', 'ol', 'li', 'a', 'strong', 'em'];

/** Draws a lesson file with stand-ins for <Machine> and <Quiz>, and reads the HTML back. */
function render(Content: MDXContent): Element {
  const html = renderToStaticMarkup(
    <Content components={{ Machine: ({ example }: { example: ExampleId }) => <div data-machine={example} />, Quiz: () => <div data-quiz="" /> }} />,
  );
  const page = document.createElement('div');
  page.innerHTML = html;
  return page;
}

/** The parts a translation must keep, in order: headings, quotes, lists, machines and the quiz. */
function skeleton(page: Element): string[] {
  return [...page.querySelectorAll('h2, h3, blockquote, ul, ol, [data-machine], [data-quiz]')].map((element) =>
    element.hasAttribute('data-machine') ? `machine:${element.getAttribute('data-machine')}` : element.tagName.toLowerCase().replace('div', 'quiz'),
  );
}

const lessons = Object.keys(quizKeys).map((path) => lessonAndName(path)[0]);

describe('lesson files (content/lessons)', () => {
  it('has at least one lesson', () => {
    expect(lessons.length).toBeGreaterThan(0);
  });

  describe.each(lessons)('%s', (lesson) => {
    const key = quizKeys[`../../content/lessons/${lesson}/quiz.ts`].quiz;
    const files = Object.entries(mdxFiles).filter(([path]) => lessonAndName(path)[0] === lesson);
    const texts = Object.entries(quizTexts).filter(([path]) => lessonAndName(path)[0] === lesson);

    it('has a quiz of 4 or 5 questions, with 3 or 4 options each and unique ids (spec 2.4)', () => {
      expect(key.length).toBeGreaterThanOrEqual(4);
      expect(key.length).toBeLessThanOrEqual(5);
      expect(new Set(key.map((question) => question.id)).size).toBe(key.length);
      for (const question of key) {
        expect(question.options.length, question.id).toBeGreaterThanOrEqual(3);
        expect(question.options.length, question.id).toBeLessThanOrEqual(4);
        expect(new Set(question.options).size, question.id).toBe(question.options.length);
        expect(question.options, question.id).toContain(question.answer);
      }
    });

    it.each(texts.map(([path, data]) => [lessonAndName(path)[1], data] as const))('%s has the question and option ids of quiz.ts', (name, data) => {
      expect(() => buildQuiz(key, data, `${lesson}/${name}.json`)).not.toThrow();
    });

    it.each(files.map(([path, module]) => [lessonAndName(path)[1], module.default] as const))('%s.mdx holds only markdown, <Machine> and <Quiz>', (_, Content) => {
      const page = render(Content);
      const tags = new Set([...page.querySelectorAll('*:not([data-machine]):not([data-quiz])')].map((element) => element.tagName.toLowerCase()));
      expect([...tags].filter((tag) => !MARKDOWN_TAGS.includes(tag))).toEqual([]);
      expect(page.querySelectorAll('[data-quiz]')).toHaveLength(1);
      const machines = [...page.querySelectorAll('[data-machine]')].map((machine) => machine.getAttribute('data-machine'));
      expect(machines.length).toBeGreaterThan(0);
      for (const example of machines) expect(EXAMPLE_IDS).toContain(example);
      // Links leave the site: a link inside the site would need the visitor's language.
      for (const link of page.querySelectorAll('a')) expect(link.getAttribute('href')).toMatch(/^https:\/\//);
    });

    it('has the same headings, quotes, lists, machines and quiz in every language, in the same order', () => {
      const english = files.find(([path]) => lessonAndName(path)[1] === 'en');
      if (english === undefined) throw new Error(`${lesson} has no en.mdx`);
      const expected = skeleton(render(english[1].default));
      for (const [path, module] of files) expect(skeleton(render(module.default)), path).toEqual(expected);
    });
  });
});
