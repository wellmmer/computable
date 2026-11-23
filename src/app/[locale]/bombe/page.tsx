import type { Metadata } from 'next';
import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { BombeHistory } from '@/bombe/BombeHistory';
import { BombeLab } from '@/bombe/BombeLab';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('bombe.page');
  return { title: t('title') };
}

/** The Bombe lab (spec R4 3): the title and lead from the server, the lab in the browser, the history under it (spec R4 5). */
export default function BombePage() {
  const t = useTranslations('bombe.page');
  return (
    <main className="mx-auto w-full max-w-[1200px] px-4 py-8 sm:px-7 sm:py-10">
      <h1 className="font-display text-[34px]/[1.1] font-extrabold tracking-tight sm:text-[40px]/[1.1]">{t('title')}</h1>
      <p className="mt-2 text-lg/relaxed">{t('lead')}</p>
      <BombeLab />
      <BombeHistory />
    </main>
  );
}
