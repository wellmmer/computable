import type { Metadata } from 'next';
import { useLocale, useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { accountConfig } from '@/account/config';
import { supportHandles } from '@/config/support';
import { pageLead, pageMain, pageTitle } from '@/shell/page-styles';
import { SupportView } from '@/support/SupportView';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('support');
  return { title: t('pageTitle') };
}

/**
 * Support the dev (spec 7). The payment handles live in src/config/support.ts. The lead says "no
 * accounts" only when the 2 Supabase values are missing, so the site has no sign-in (spec R5b 2).
 */
export default function SupportPage() {
  const t = useTranslations('support');
  const locale = useLocale();
  return (
    <main className={pageMain}>
      <h1 className={pageTitle}>{t('title')}</h1>
      <p className={pageLead}>{accountConfig() === null ? t('lead') : t('leadAccounts')}</p>
      {/* Another language may ask for another currency, so the chosen amount starts again. */}
      <SupportView key={locale} handles={supportHandles} />
    </main>
  );
}
