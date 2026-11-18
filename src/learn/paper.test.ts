import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { routing } from '@/i18n/routing';
import { PAPER_PARTS } from '../../content/paper/parts';
import { LESSON_SLUGS } from './lesson-slugs';
import { PAPER, paperTexts } from './paper';

/** A language file as it is on disk, before any check. */
function readFile(locale: string): { parts: Record<string, { title: string; summary: string[]; translation?: string }> } {
  return JSON.parse(readFileSync(join(process.cwd(), 'content', 'paper', `${locale}.json`), 'utf8'));
}

describe('the parts of the paper (spec R2c 3)', () => {
  it('lists sections 1 to 11, the appendix and the correction, in this order', () => {
    expect(PAPER_PARTS.map(({ id }) => id)).toEqual([
      'section-1',
      'section-2',
      'section-3',
      'section-4',
      'section-5',
      'section-6',
      'section-7',
      'section-8',
      'section-9',
      'section-10',
      'section-11',
      'appendix',
      'correction',
    ]);
  });

  it('gives each part its pages in the Proceedings, checked on the scan, in reading order', () => {
    expect(PAPER_PARTS.map(({ volume, pages }) => `${volume}: ${pages.join('–')}`)).toEqual([
      '42: 231–232',
      '42: 232–233',
      '42: 233–235',
      '42: 235–239',
      '42: 239–241',
      '42: 241–243',
      '42: 243–246',
      '42: 246–248',
      '42: 249–254',
      '42: 254–258',
      '42: 259–263',
      '42: 263–265',
      '43: 544–546',
    ]);
  });

  it('quotes at most once per part, from a page inside the part', () => {
    for (const { id, pages, quote } of PAPER_PARTS) {
      if (quote === null) continue;
      expect(quote.page, id).toBeGreaterThanOrEqual(pages[0]);
      expect(quote.page, id).toBeLessThanOrEqual(pages[1]);
    }
    // No scan of the correction was read, so it has no quote.
    expect(PAPER_PARTS.filter(({ quote }) => quote === null).map(({ id }) => id)).toEqual(['correction']);
  });

  it('links only lessons that exist', () => {
    for (const { id, lessons } of PAPER_PARTS) {
      for (const slug of lessons) expect(LESSON_SLUGS, `${id} links ${slug}`).toContain(slug);
    }
  });
});

describe('the guide in 5 languages (spec R2c 3)', () => {
  it.each(routing.locales)('content/paper/%s.json has a text for every part, and no other', (locale) => {
    expect(Object.keys(readFile(locale).parts)).toEqual(PAPER_PARTS.map(({ id }) => id));
  });

  it.each(routing.locales)('content/paper/%s.json gives each part a summary of 2 to 4 sentences', (locale) => {
    for (const [id, { summary }] of Object.entries(readFile(locale).parts)) {
      expect(summary.length, id).toBeGreaterThanOrEqual(2);
      expect(summary.length, id).toBeLessThanOrEqual(4);
    }
  });

  it('shows the same parts, pages and English quotes in every language', () => {
    const shape = (locale: (typeof routing.locales)[number]) =>
      PAPER[locale].map(({ id, volume, pages, quote, lessons }) => ({ id, volume, pages, quote, lessons }));
    for (const locale of routing.locales) expect(shape(locale), locale).toEqual(shape('en'));
  });

  it('adds a translation next to each quote in the other languages, and none in English', () => {
    for (const locale of routing.locales) {
      for (const { id, quote, text } of PAPER[locale]) {
        const wanted = locale !== 'en' && quote !== null;
        expect(text.translation !== null, `${locale} ${id}`).toBe(wanted);
      }
    }
  });

  it('refuses a language file that misses a part, has an extra one, or has a translation in the wrong place', () => {
    const en = readFile('en');
    const withoutSection4 = Object.fromEntries(Object.entries(en.parts).filter(([id]) => id !== 'section-4'));
    expect(() => paperTexts('en', { parts: withoutSection4 })).toThrow('content/paper/en.json: parts.section-4');
    expect(() => paperTexts('en', { parts: { ...en.parts, 'section-12': en.parts['section-1'] } })).toThrow('content/paper/en.json');
    expect(() => paperTexts('en', { parts: { ...en.parts, 'section-1': { ...en.parts['section-1'], translation: 'x' } } })).toThrow(
      'content/paper/en.json: parts.section-1.translation: English needs no translation',
    );
    const pt = readFile('pt-BR');
    const noTranslation = { title: pt.parts['section-1'].title, summary: pt.parts['section-1'].summary };
    expect(() => paperTexts('pt-BR', { parts: { ...pt.parts, 'section-1': noTranslation } })).toThrow(
      'content/paper/pt-BR.json: parts.section-1.translation: the quote needs a translation',
    );
  });
});
