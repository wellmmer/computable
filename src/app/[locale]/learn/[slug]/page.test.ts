import { describe, expect, it } from 'vitest';
import LessonPage, { generateStaticParams } from './page';

const props = (slug: string) => ({ params: Promise.resolve({ locale: 'en', slug }), searchParams: Promise.resolve({}) });

describe('the lesson page', () => {
  it('is built for every lesson (spec 3: the pages are static)', () => {
    expect(generateStaticParams()).toEqual([
      { slug: 'intuition' },
      { slug: 'formal-definition' },
      { slug: 'universal-machine' },
      { slug: 'halting-problem' },
      { slug: 'entscheidungsproblem' },
      { slug: 'church-turing' },
    ]);
  });

  it('answers 404 for a lesson that does not exist', async () => {
    await expect(LessonPage(props('no-such-lesson'))).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404');
  });
});
