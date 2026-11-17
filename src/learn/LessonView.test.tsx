// @vitest-environment jsdom
import { cleanup, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithIntl } from '@/test/intl';
import { LESSONS, type Lesson } from './lessons';
import { LessonView } from './LessonView';

// The real Link needs the Next.js router, which screen tests do not have.
vi.mock('@/i18n/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/i18n/navigation')>()),
  Link: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

afterEach(cleanup);

/** Lesson 1 with another slug and title, to see the links between two lessons before lesson 2 exists. */
const second: Lesson = {
  slug: 'formal-definition',
  text: { ...LESSONS[0].text, en: { ...LESSONS[0].text.en, meta: { ...LESSONS[0].text.en.meta, title: 'The formal definition' } } },
};

/** True when `first` comes before `then` in the page. */
const before = (first: Element, then: Element) => Boolean(first.compareDocumentPosition(then) & Node.DOCUMENT_POSITION_FOLLOWING);

describe('LessonView (spec 2.2)', () => {
  it('shows the place of the lesson, its title and its reading time', () => {
    renderWithIntl(<LessonView lessons={LESSONS} index={0} />);
    expect(screen.getByText('Lesson 1 of 1')).toBeTruthy();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Intuition: the human computer');
    expect(screen.getByText('7 min read')).toBeTruthy();
  });

  it('shows the text with its machines, then the quiz, the sources, the license and the lesson links', () => {
    renderWithIntl(<LessonView lessons={LESSONS} index={0} />);
    expect(screen.getByRole('figure', { name: 'Turing 1936: 0 1 0 1…' })).toBeTruthy();
    expect(screen.getByRole('figure', { name: 'Binary +1' })).toBeTruthy();
    const quiz = screen.getByRole('heading', { level: 2, name: 'Check what you learned' });
    expect(screen.getAllByRole('group', { name: /^Question \d of 5/ })).toHaveLength(5);
    const sources = screen.getByRole('heading', { level: 2, name: 'Sources' });
    const license = screen.getByRole('link', { name: 'CC BY 4.0' });
    const nav = screen.getByRole('navigation', { name: 'Lessons' });
    expect(before(quiz, sources) && before(sources, license) && before(license, nav)).toBe(true);
    expect(license.getAttribute('href')).toBe('https://creativecommons.org/licenses/by/4.0/');
  });

  it('links all the lessons, and no previous or next lesson when there is only one', () => {
    renderWithIntl(<LessonView lessons={LESSONS} index={0} />);
    const nav = screen.getByRole('navigation', { name: 'Lessons' });
    expect(within(nav).getAllByRole('link').map((link) => [link.textContent, link.getAttribute('href')])).toEqual([['All lessons', '/learn']]);
  });

  it('links the previous and the next lesson', () => {
    renderWithIntl(<LessonView lessons={[LESSONS[0], second]} index={0} />);
    expect(screen.getByText('Lesson 1 of 2')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Next lesson: The formal definition' }).getAttribute('href')).toBe('/learn/formal-definition');
    cleanup();
    renderWithIntl(<LessonView lessons={[LESSONS[0], second]} index={1} />);
    expect(screen.getByText('Lesson 2 of 2')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Previous lesson: Intuition: the human computer' }).getAttribute('href')).toBe('/learn/intuition');
    expect(screen.queryByRole('link', { name: /^Next lesson/ })).toBeNull();
  });
});
