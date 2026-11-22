'use client';

import { useTranslations } from 'next-intl';
import type { Menu } from '@/engines/bombe';
import { card, cardTitle } from './CribCard';
import { DRAWING_SIZE, drawMenu } from './menu-drawing';

/**
 * The menu card (spec R4 3): the loop count, and a drawing of the menu. Letters are circles and
 * links are lines. The center letter, where the test starts, has a red ring. In slow step mode, the
 * link in use is a thick red line (spec R4 4).
 */
export function MenuCard({ menu, activeLink = null }: { menu: Menu; activeLink?: number | null }) {
  const t = useTranslations('bombe.menu');
  const drawing = drawMenu(menu);
  // The link in use goes last, so it is drawn on top of the others.
  const lines = [...drawing.lines.filter(({ link }) => link !== activeLink), ...drawing.lines.filter(({ link }) => link === activeLink)];
  return (
    <section aria-labelledby="menu-title" className={card}>
      <h2 id="menu-title" className={cardTitle}>
        {t('title', { loops: menu.loops })}
      </h2>
      <p className="text-sm">{t('lead')}</p>
      {menu.center === null ? (
        <p className="mt-2 text-sm text-muted">{t('empty')}</p>
      ) : (
        <>
          <svg
            role="img"
            aria-label={t('drawing', { links: menu.links.length, letters: menu.letters.length, center: menu.center })}
            viewBox={`0 0 ${DRAWING_SIZE} ${DRAWING_SIZE}`}
            className="mx-auto mt-2 block w-full max-w-[260px]"
          >
            {lines.map(({ key, link, path }) =>
              link === activeLink ? (
                <path key={key} data-link={link} data-active d={path} fill="none" strokeWidth={5} className="stroke-pencil" />
              ) : (
                <path key={key} data-link={link} d={path} fill="none" strokeWidth={2} className="stroke-muted" />
              ),
            )}
            {drawing.letters.map(({ letter, x, y, center }) => (
              <g key={letter}>
                <circle cx={x} cy={y} r={14} strokeWidth={center ? 3 : 2} className={`fill-cell ${center ? 'stroke-pencil' : 'stroke-ink'}`} />
                <text x={x} y={y} textAnchor="middle" dominantBaseline="central" className="fill-ink font-mono text-[13px] font-bold">
                  {letter}
                </text>
              </g>
            ))}
          </svg>
          <p className="mt-1 text-sm text-muted">{t('legend', { center: menu.center })}</p>
        </>
      )}
    </section>
  );
}
