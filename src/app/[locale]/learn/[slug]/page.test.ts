import { describe, expect, it } from 'vitest';
import LessonPage, { generateStaticParams } from './page';

const props = (slug: string) => ({ params: Promise.resolve({ locale: 'en', slug }), searchParams: Promise.resolve({}) });

describe('the lesson page', () => {
  it('is built for every lesson (spec 3: the pages are static)', () => {
    expect(generateStaticParams()).toEqual([{ slug: 'intuition' }]);
  });

  it('answers 404 for a lesson that does not exist', async () => {
    await expect(LessonPage(props('halting-problem'))).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404');
  });
});
