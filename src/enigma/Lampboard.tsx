import { KEY_ROWS, type Letter } from '@/engines/enigma';

/** A round lamp or key: 32 px, so 9 of them fit across a 390 px phone. */
export const round = 'flex size-8 items-center justify-center rounded-full font-mono text-[13px] font-bold';

/**
 * The 26 lamps in the German key rows, with `lit` glowing. Screen readers skip it: the page says
 * the lit letter in words. The lab and Home's small Enigma both draw it on the bakelite panel.
 */
export function Lampboard({ lit }: { lit: Letter | null }) {
  return (
    <div aria-hidden data-lampboard>
      {KEY_ROWS.map((row) => (
        <div key={row.join('')} className="my-1.5 flex justify-center gap-1 sm:gap-1.5">
          {row.map((letter) => (
            <span
              key={letter}
              data-lamp
              data-lit={letter === lit ? '' : undefined}
              className={`${round} ${letter === lit ? 'bg-lamp text-bakelite shadow-[0_0_14px_var(--lamp)]' : 'bg-lamp-off text-lamp-off-ink'}`}
            >
              {letter}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}
