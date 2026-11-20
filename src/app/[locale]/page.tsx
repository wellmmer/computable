import { ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { HomeMachine } from '@/home/HomeMachine';
import { HomeSecret } from '@/home/HomeSecret';
import { Link } from '@/i18n/navigation';

const link = 'inline-flex items-center gap-2 border-2 border-ink px-5 py-2.5 text-lg font-semibold active:translate-y-px';

/**
 * Home from R3 (spec R3 4): the title, one sentence, "Type a secret message" on a small Enigma, the
 * buttons to the lab and the simulator, then Turing's first machine running, in a narrower box.
 */
export default function HomePage() {
  const t = useTranslations('home');
  return (
    <main className="py-12 sm:py-16">
      <div className="mx-auto max-w-[1200px] px-4 text-center sm:px-7">
        <h1 className="font-display text-[48px]/none font-extrabold tracking-tight sm:text-[76px]/none">{t('title')}</h1>
        <p className="mx-auto mt-5 max-w-[36ch] text-lg/snug sm:text-xl/snug">{t('lead')}</p>
      </div>
      <div className="mt-8 sm:mt-10">
        <HomeSecret />
      </div>
      <p className="mx-auto mt-8 flex max-w-[720px] flex-wrap gap-3 px-4">
        <Link href="/enigma" className={`${link} bg-ink text-paper`}>
          {t('openLab')}
          <ArrowRight aria-hidden className="size-5" />
        </Link>
        <Link href="/simulator" className={`${link} bg-cell text-ink`}>
          {t('openSimulator')}
          <ArrowRight aria-hidden className="size-5" />
        </Link>
      </p>
      <section aria-labelledby="tape-title" className="mx-auto mt-14 max-w-[720px]">
        <h2 id="tape-title" className="px-4 font-display text-xl font-semibold">
          {t('tapeTitle')}
        </h2>
        <HomeMachine />
      </section>
    </main>
  );
}
