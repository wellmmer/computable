import type { Metadata } from 'next';
import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { accountConfig } from '@/account/config';
import { ANALYTICS } from '@/config/analytics';
import { ISSUES_URL } from '@/config/links';
import { pageLead, pageMain, pageTitle, sectionTitle, sheet, textLink } from '@/shell/page-styles';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('privacy');
  return { title: t('pageTitle') };
}

/**
 * Privacy (spec 4.2): what stays in the browser (quiz results too, spec R2a 4, and Home’s secret, spec R3 4), the optional
 * accounts (spec R5b 4), the one language cookie, what the cookieless analytics counts, and donations.
 * Without the 2 Supabase values the site has no sign-in, so the page says nothing about accounts (spec R5b 2).
 */
export default function PrivacyPage() {
  const t = useTranslations('privacy');
  const hasAccounts = accountConfig() !== null;
  return (
    <main className={pageMain}>
      <h1 className={pageTitle}>{t('title')}</h1>
      <p className={pageLead}>{hasAccounts ? t('accounts.lead') : t('lead')}</p>

      <div className={`mt-10 space-y-8 ${sheet}`}>
        <section aria-labelledby="browser-title" className="space-y-3">
          <h2 id="browser-title" className={sectionTitle}>
            {t('browserTitle')}
          </h2>
          <p>{t('browser')}</p>
          <p>{t('quiz')}</p>
          <p>{t('secret')}</p>
          <p>{t('language')}</p>
          <p>{t('shareLink')}</p>
        </section>

        {hasAccounts && (
          <section aria-labelledby="accounts-title" className="space-y-3">
            <h2 id="accounts-title" className={sectionTitle}>
              {t('accounts.title')}
            </h2>
            <p>{t('accounts.stored')}</p>
            <p>{t('accounts.later')}</p>
            <p>{t('accounts.where')}</p>
            <p>{t('accounts.session')}</p>
            <p>{t('accounts.delete')}</p>
          </section>
        )}

        <section aria-labelledby="analytics-title" className="space-y-3">
          <h2 id="analytics-title" className={sectionTitle}>
            {t('analytics.title')}
          </h2>
          <p>{t('analytics.summary', { service: ANALYTICS.service })}</p>
          <p>{t('analytics.counted')}</p>
          <p>{t('analytics.address')}</p>
          <p>{t('analytics.visitor')}</p>
          <p>
            <a href={ANALYTICS.privacyUrl} className={textLink}>
              {t('analytics.source', { service: ANALYTICS.service })}
            </a>
          </p>
        </section>

        <section aria-labelledby="donations-title" className="space-y-3">
          <h2 id="donations-title" className={sectionTitle}>
            {t('donationsTitle')}
          </h2>
          <p>{t('donations')}</p>
        </section>
      </div>

      <p className="mt-8">
        {t.rich('questions', {
          link: (chunks) => (
            <a href={ISSUES_URL} className={textLink}>
              {chunks}
            </a>
          ),
        })}
      </p>
    </main>
  );
}
