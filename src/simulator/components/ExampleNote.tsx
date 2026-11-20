'use client';

import { Info } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useSimulator } from './store-context';

/** A short note under the header for the one-rotor cipher (spec R3 5). The other examples have none. */
export function ExampleNote() {
  const t = useTranslations('simulator.oneRotor');
  const exampleId = useSimulator((s) => s.exampleId);
  if (exampleId !== 'one-rotor') return null;
  return (
    <p data-testid="example-note" className="mx-auto mt-4 flex max-w-[640px] items-start gap-2 bg-cell px-3 py-2 text-sm">
      <Info aria-hidden className="mt-0.5 size-4 flex-none" />
      <span>
        {t.rich('note', {
          lab: (chunks) => (
            <Link href="/enigma" className="font-semibold underline decoration-1 underline-offset-4 hover:decoration-2">
              {chunks}
            </Link>
          ),
        })}
      </span>
    </p>
  );
}
