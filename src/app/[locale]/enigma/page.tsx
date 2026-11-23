import type { Metadata } from 'next';
import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { EnigmaLab } from '@/enigma/EnigmaLab';
import { M4History } from '@/enigma/M4History';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('enigma.page');
  return { title: t('title') };
}

/** The Enigma lab (spec R3 3): the title and lead from the server, the machine in the browser, the M4 history under it (spec R5a 4). */
export default function EnigmaPage() {
  const t = useTranslations('enigma.page');
  return (
    <main className="mx-auto w-full max-w-[1200px] px-4 py-8 sm:px-7 sm:py-10">
      <h1 className="font-display text-[34px]/[1.1] font-extrabold tracking-tight sm:text-[40px]/[1.1]">{t('title')}</h1>
      <p className="mt-2 text-lg/relaxed">{t('lead')}</p>
      <EnigmaLab />
      <M4History />
    </main>
  );
}
