'use client';

import { useTranslations } from 'next-intl';
import { AccountArea } from '@/account/AccountArea';
import { accountConfig } from '@/account/config';
import { Link, usePathname } from '@/i18n/navigation';
import { ThemeSwitch } from '@/theme/ThemeSwitch';
import { TourButton } from '@/tour/TourButton';
import { BombeIcon, BookIcon, CupIcon, RotorIcon, TapeIcon } from './icons';
import { LanguageSwitcher } from './LanguageSwitcher';
import { isCurrentPage, MENU_ITEMS, type MenuId, type MenuItem } from './menu';

const ICONS: Record<MenuId, typeof BookIcon> = { learn: BookIcon, simulator: TapeIcon, enigma: RotorIcon, bombe: BombeIcon };

/** On phones the icon sits above its name. From 640px they sit side by side. */
const entry = 'flex flex-col items-center gap-1 py-1 text-[13px]/tight sm:flex-row sm:gap-2 sm:text-[15px]/tight';

function MenuEntry({ item, pathname }: { item: MenuItem; pathname: string }) {
  const t = useTranslations('shell.menu');
  const Icon = ICONS[item.id];
  if (item.href === null) {
    return (
      <span className={`${entry} text-muted`}>
        <Icon className="size-[19px] shrink-0" />
        <span>
          {t(item.id)}
          <span className="sr-only">, {t('comingSoon')}</span>
        </span>
        <span aria-hidden className="font-display text-[12px] whitespace-nowrap italic sm:text-[13px]">
          {t('soon')}
        </span>
      </span>
    );
  }
  const current = isCurrentPage(pathname, item.href);
  return (
    <Link
      href={item.href}
      aria-current={current ? 'page' : undefined}
      className={`${entry} ${current ? 'font-semibold text-ink' : 'text-muted hover:text-ink'}`}
    >
      <Icon className={`size-[19px] shrink-0 ${current ? 'text-pencil' : ''}`} />
      {t(item.id)}
    </Link>
  );
}

/** The class names that place the parts of the menu bar from 768px up. */
interface Layout {
  readonly grid: string;
  readonly nav: string;
  readonly buttons: string;
  readonly support: string;
}

/** Tailwind finds class names only as whole strings, so each layout spells them out. */
const WITHOUT_ACCOUNTS: Layout = {
  grid: 'md:grid-cols-[1fr_minmax(0,auto)_auto] xl:grid-cols-[auto_1fr_auto_auto] xl:gap-x-6',
  nav: 'md:col-span-3 xl:col-span-1 xl:col-start-2 xl:row-start-1',
  buttons: 'md:col-span-1 md:col-start-2 md:row-start-1 xl:col-start-3',
  support: 'md:col-start-3 xl:col-start-4',
};

const WITH_ACCOUNTS: Layout = {
  grid: 'lg:grid-cols-[1fr_minmax(0,auto)_auto]',
  nav: 'lg:col-span-3',
  buttons: 'lg:col-span-1 lg:col-start-2 lg:row-start-1',
  support: 'lg:col-start-3',
};

/**
 * The menu bar from the approved mockup (simulator-v4.html): the wordmark, the four sections, the
 * language switcher, "? Tour", Support the dev and the theme switch. Below 768px the sections get a
 * row of their own, and the language switcher and Tour get a third row. From 768px they move to the
 * first row, and from 1280px everything is one row.
 *
 * When accounts are set up (spec R5b 4), "Sign in" or the account name follows Tour. Then the third
 * row stays up to 1023px, and the sections keep their own row at every width. Linux draws the fonts
 * a few pixels wider than macOS. There, one row needs 1182px to 1258px in most languages, and the
 * row has 1144px. Two rows at 768px need up to 839px of screen in Spanish.
 *
 * The column of the buttons is `minmax(0,auto)`, not `auto`, because an `auto` column never gets
 * narrower than the full account name. So when room is short, the account name ends in "…".
 */
export function SiteHeader() {
  const t = useTranslations('shell.menu');
  const pathname = usePathname();
  const supportCurrent = isCurrentPage(pathname, '/support');
  // Next.js writes the 2 Supabase values into the code at build time, so the layout never jumps.
  const layout = accountConfig() === null ? WITHOUT_ACCOUNTS : WITH_ACCOUNTS;

  return (
    <header className="border-b-2 border-ink bg-cell">
      <div className={`mx-auto grid max-w-[1200px] grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-7 ${layout.grid}`}>
        <Link href="/" className="col-start-1 row-start-1 justify-self-start font-display text-[22px]/none font-extrabold tracking-tight text-ink">
          {t('wordmark')}
        </Link>
        <nav aria-label={t('label')} className={`col-span-2 row-start-2 ${layout.nav}`}>
          <ul className="grid grid-cols-4 gap-1 sm:flex sm:gap-7">
            {MENU_ITEMS.map((item) => (
              <li key={item.id}>
                <MenuEntry item={item} pathname={pathname} />
              </li>
            ))}
          </ul>
        </nav>
        <div className={`col-span-2 row-start-3 flex justify-end gap-2 ${layout.buttons}`}>
          <LanguageSwitcher />
          <TourButton />
          <AccountArea />
        </div>
        <div className={`col-start-2 row-start-1 flex items-center gap-4 ${layout.support}`}>
          <Link
            href="/support"
            aria-current={supportCurrent ? 'page' : undefined}
            className="inline-flex items-center gap-2 py-1 font-semibold text-ink md:whitespace-nowrap"
          >
            <CupIcon className={`size-[19px] shrink-0 ${supportCurrent ? 'text-pencil' : 'text-coffee'}`} />
            {t('support')}
          </Link>
          <ThemeSwitch />
        </div>
      </div>
    </header>
  );
}
