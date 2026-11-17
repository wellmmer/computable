// @vitest-environment jsdom
/// <reference types="vite/client" />
import type { MDXContent } from 'mdx/types';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { routing } from '@/i18n/routing';
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

/** The tags that markdown makes from headings, paragraphs, quotes, lists, links, emphasis (spec 3) and tables (spec R2b 2). */
const MARKDOWN_TAGS = ['h2', 'h3', 'p', 'blockquote', 'ul', 'ol', 'li', 'a', 'strong', 'em', 'table', 'thead', 'tbody', 'tr', 'th', 'td'];

/** Draws a lesson file with stand-ins for <Machine>, <Encoding> and <Quiz>, and reads the HTML back. */
function render(Content: MDXContent): Element {
  const html = renderToStaticMarkup(
    <Content
      components={{
        Machine: ({ example }: { example: ExampleId }) => <div data-machine={example} />,
        Encoding: () => <div data-encoding="" />,
        Quiz: () => <div data-quiz="" />,
      }}
    />,
  );
  const page = document.createElement('div');
  page.innerHTML = html;
  return page;
}

/** The parts a translation must keep, in order: headings, quotes, lists, tables, machines, the encoding and the quiz. */
function skeleton(page: Element): string[] {
  return [...page.querySelectorAll('h2, h3, blockquote, ul, ol, table, tr, [data-machine], [data-encoding], [data-quiz]')].map((element) => {
    if (element.hasAttribute('data-machine')) return `machine:${element.getAttribute('data-machine')}`;
    if (element.hasAttribute('data-encoding')) return 'encoding';
    if (element.hasAttribute('data-quiz')) return 'quiz';
    return element.tagName.toLowerCase();
  });
}

/** The lessons without a <Machine>: lessons 5 and 6 have a quiz only (spec R2b 2). Every other lesson runs at least one machine. */
const LESSONS_WITHOUT_MACHINES: readonly string[] = ['entscheidungsproblem'];

/**
 * The sources that lessons link, each with the text that finds it in a "Sources" list, its link, and
 * the lessons that cite it. A lesson that cites a source must be named here, and a lesson named here
 * must cite it, once.
 */
const LINKED_SOURCES: readonly { name: string; link: string; lessons: readonly string[] }[] = [
  {
    // Sipser, 3rd edition, ISBN 978-1-133-18779-0: the publisher's page answered 200 on 2026-11-17.
    name: 'Introduction to the Theory of Computation',
    link: 'https://www.cengage.com/c/introduction-to-the-theory-of-computation-3e-sipser/9781133187790',
    lessons: ['intuition', 'formal-definition', 'universal-machine', 'halting-problem'],
  },
  {
    // Hopcroft–Motwani–Ullman, 3rd edition, ISBN 978-0-321-45536-9: the publisher's page answered 200 on 2026-11-17.
    name: 'Introduction to Automata Theory',
    link: 'https://www.pearson.com/en-us/subject-catalog/p/introduction-to-automata-theory-languages-and-computation/P200000003517/9780321455369',
    lessons: ['intuition', 'formal-definition', 'universal-machine', 'halting-problem'],
  },
  {
    // Turing's 1936 paper, by its DOI.
    name: 'On Computable Numbers',
    link: 'https://doi.org/10.1112/plms/s2-42.1.230',
    lessons: ['intuition', 'universal-machine', 'halting-problem', 'entscheidungsproblem'],
  },
  {
    // Petzold, The Annotated Turing (Wiley, 2008, ISBN 978-0-470-22905-7). Wiley answers 403 to scripts; a browser opened it on 2026-11-17.
    name: 'The Annotated Turing',
    link: 'https://www.wiley.com/en-us/The+Annotated+Turing%3A+A+Guided+Tour+Through+Alan+Turing%27s+Historic+Paper+on+Computability+and+the+Turing+Machine-p-9780470229057',
    lessons: ['universal-machine', 'halting-problem'],
  },
  {
    // Church's note, J. Symbolic Logic 1(1), 40–41. The DOI is registered (Crossref answered 200 on 2026-11-17); Cambridge answers 429 to scripts.
    name: 'A Note on the Entscheidungsproblem',
    link: 'https://doi.org/10.2307/2269326',
    lessons: ['entscheidungsproblem'],
  },
  {
    // Hilbert and Ackermann, 1st edition, J. Springer, 1928. It has no DOI; Open Library's record of that edition (its JSON answered 200 on 2026-11-17).
    name: 'Grundzüge der theoretischen Logik',
    link: 'https://openlibrary.org/books/OL6723331M',
    lessons: ['entscheidungsproblem'],
  },
];

/** The links of the last list in a lesson: its "Sources". */
function sourceLinks(page: Element): { text: string; hrefs: string[] }[] {
  const lists = page.querySelectorAll('ul');
  return [...lists[lists.length - 1].querySelectorAll('li')].map((item) => ({
    text: item.textContent ?? '',
    hrefs: [...item.querySelectorAll('a')].map((link) => link.getAttribute('href') ?? ''),
  }));
}

const lessons = Object.keys(quizKeys).map((path) => lessonAndName(path)[0]);

describe('lesson files (content/lessons)', () => {
  it('has at least one lesson', () => {
    expect(lessons.length).toBeGreaterThan(0);
  });

  it('names only lessons that exist in its lists', () => {
    const named = [...LESSONS_WITHOUT_MACHINES, ...LINKED_SOURCES.flatMap((source) => source.lessons)];
    expect(named.filter((slug) => !lessons.includes(slug))).toEqual([]);
  });

  describe.each(lessons)('%s', (lesson) => {
    const key = quizKeys[`../../content/lessons/${lesson}/quiz.ts`].quiz;
    const files = Object.entries(mdxFiles).filter(([path]) => lessonAndName(path)[0] === lesson);
    const texts = Object.entries(quizTexts).filter(([path]) => lessonAndName(path)[0] === lesson);

    it('has a lesson file and a quiz text file in every language (spec 1: all 5 languages go live together)', () => {
      expect(files.map(([path]) => lessonAndName(path)[1]).sort()).toEqual([...routing.locales].sort());
      expect(texts.map(([path]) => lessonAndName(path)[1]).sort()).toEqual(routing.locales.map((locale) => `quiz.${locale}`).sort());
    });

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

    it.each(files.map(([path, module]) => [lessonAndName(path)[1], module.default] as const))('%s.mdx holds only markdown, <Machine>, <Encoding> and <Quiz>', (_, Content) => {
      const page = render(Content);
      const tags = new Set([...page.querySelectorAll('*:not([data-machine]):not([data-encoding]):not([data-quiz])')].map((element) => element.tagName.toLowerCase()));
      expect([...tags].filter((tag) => !MARKDOWN_TAGS.includes(tag))).toEqual([]);
      expect(page.querySelectorAll('[data-quiz]')).toHaveLength(1);
      const machines = [...page.querySelectorAll('[data-machine]')].map((machine) => machine.getAttribute('data-machine'));
      if (LESSONS_WITHOUT_MACHINES.includes(lesson)) expect(machines).toEqual([]);
      else expect(machines.length).toBeGreaterThan(0);
      for (const example of machines) expect(EXAMPLE_IDS).toContain(example);
      // Links leave the site: a link inside the site would need the visitor's language.
      for (const link of page.querySelectorAll('a')) expect(link.getAttribute('href')).toMatch(/^https:\/\//);
    });

    it.each(files.map(([path, module]) => [lessonAndName(path)[1], module.default] as const))('%s.mdx cites the sources its lesson cites, each once, with its link', (_, Content) => {
      const sources = sourceLinks(render(Content));
      for (const { name, link, lessons: citing } of LINKED_SOURCES) {
        const items = sources.filter((item) => item.text.includes(name));
        expect(items, name).toHaveLength(citing.includes(lesson) ? 1 : 0);
        for (const item of items) expect(item.hrefs, name).toContain(link);
      }
    });

    it('has the same headings, quotes, lists, machines and quiz in every language, in the same order', () => {
      const english = files.find(([path]) => lessonAndName(path)[1] === 'en');
      if (english === undefined) throw new Error(`${lesson} has no en.mdx`);
      const expected = skeleton(render(english[1].default));
      for (const [path, module] of files) expect(skeleton(render(module.default)), path).toEqual(expected);
    });
  });
});
