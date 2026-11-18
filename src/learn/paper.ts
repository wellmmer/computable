import type { Locale } from 'next-intl';
import { z } from 'zod';
import de from '../../content/paper/de.json';
import en from '../../content/paper/en.json';
import es from '../../content/paper/es.json';
import fr from '../../content/paper/fr.json';
import { PAPER_PARTS, type PaperPart } from '../../content/paper/parts';
import ptBR from '../../content/paper/pt-BR.json';

/** The texts of one part in one language. `translation` translates the quote, and is null in English. */
export interface PaperPartText {
  title: string;
  summary: string[];
  translation: string | null;
}

/** One block of the reading guide: a part of the paper with its texts in one language. */
export interface PaperBlock extends PaperPart {
  text: PaperPartText;
}

const partSchema = z.strictObject({
  title: z.string().min(1),
  summary: z.array(z.string().min(1)).min(2).max(4),
  translation: z.string().min(1).optional(),
});

const fileSchema = z.strictObject({
  parts: z.strictObject(Object.fromEntries(PAPER_PARTS.map(({ id }) => [id, partSchema]))),
});

/**
 * Checks a language file against PAPER_PARTS and returns its texts in the order of the parts. A
 * missing or extra part, a summary of fewer than 2 or more than 4 sentences, or a translation in the
 * wrong place throws, so `next build` fails (spec R2c 3).
 */
export function paperTexts(locale: Locale, data: unknown): PaperPartText[] {
  const file = `content/paper/${locale}.json`;
  const parsed = fileSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(`${file}: ${parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ')}`);
  }
  return PAPER_PARTS.map(({ id, quote }) => {
    const { title, summary, translation } = parsed.data.parts[id];
    if (locale === 'en' && translation !== undefined) throw new Error(`${file}: parts.${id}.translation: English needs no translation`);
    if (locale !== 'en' && quote !== null && translation === undefined) {
      throw new Error(`${file}: parts.${id}.translation: the quote needs a translation`);
    }
    if (quote === null && translation !== undefined) throw new Error(`${file}: parts.${id}.translation: this part has no quote`);
    return { title, summary, translation: translation ?? null };
  });
}

function blocks(locale: Locale, data: unknown): readonly PaperBlock[] {
  const texts = paperTexts(locale, data);
  return PAPER_PARTS.map((part, index) => ({ ...part, text: texts[index] }));
}

/** The reading guide in every language. A language missing here fails the type check. */
export const PAPER: Record<Locale, readonly PaperBlock[]> = {
  en: blocks('en', en),
  'pt-BR': blocks('pt-BR', ptBR),
  es: blocks('es', es),
  fr: blocks('fr', fr),
  de: blocks('de', de),
};
