import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { PaperGuide } from '@/learn/PaperGuide';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('learn.paper');
  return { title: t('pageTitle') };
}

/** The reading guide to Turing's 1936 paper (spec R2c 3). A folder of its own, so it wins over /learn/[slug]. */
export default function PaperPage() {
  return <PaperGuide />;
}
