'use client';

import { useTranslations } from 'next-intl';
import { useId, useState } from 'react';
import { isTuringRule, standardDescription } from '@/engines/turing';
import { examples } from '@/simulator/examples';

const machine = examples['turing-1936'].machine;
const encoding = standardDescription(machine);

/** A mark that does not rely on colour: the part is also bold and underlined. */
const markClass = 'bg-row-now font-bold text-ink underline decoration-2 underline-offset-4';

/** One string split into the parts of the rows, with the part of the active row marked. */
function Parts({ parts, active, testId }: { parts: string[]; active: number | null; testId: string }) {
  return (
    <dd data-testid={testId} className="mt-1 font-mono text-[15px] break-all">
      {parts.map((part, index) =>
        index === active ? (
          <mark key={index} className={markClass}>
            {part}
          </mark>
        ) : (
          <span key={index}>{part}</span>
        ),
      )}
    </dd>
  );
}

/**
 * Turing's first machine as a rule table, as its standard description and as its description number
 * (spec R2b 2, lesson 3). A row marks its part of both strings while it has the focus or the pointer.
 * The last column also shows that part in words, so nothing depends on the mark. Nothing moves, so
 * reduced motion needs no special case.
 */
export function LessonEncoding() {
  const t = useTranslations('learn.encoding');
  const tTable = useTranslations('simulator.table');
  const captionId = useId();
  const [active, setActive] = useState<number | null>(null);
  const leave = (index: number) => setActive((current) => (current === index ? null : current));

  return (
    <figure aria-labelledby={captionId} className="mt-8 border-2 border-ink bg-cell px-3 pt-3 pb-5">
      <figcaption id={captionId} className="font-display text-lg font-semibold">
        {t('caption')}
      </figcaption>
      <p className="mt-2 text-sm text-muted">{t('hint')}</p>
      <table className="mt-4 w-full border-collapse text-left text-[15px] hyphens-auto">
        <thead>
          <tr className="border-b-2 border-ink text-sm">
            <th scope="col" className="py-2 pr-2 align-bottom font-semibold">
              {tTable('state')}
            </th>
            <th scope="col" className="py-2 pr-2 align-bottom font-semibold">
              {tTable('read')}
            </th>
            <th scope="col" className="py-2 pr-2 align-bottom font-semibold">
              {tTable('ops')}
            </th>
            <th scope="col" className="py-2 pr-2 align-bottom font-semibold">
              {tTable('next')}
            </th>
            <th scope="col" className="py-2 align-bottom font-semibold">
              {t('column')}
            </th>
          </tr>
        </thead>
        <tbody>
          {encoding.lines.map((line, index) => {
            const rule = machine.rules[line.ruleIndex];
            const read = typeof rule.read === 'string' ? rule.read : tTable(rule.read.match === 'blank' ? 'blank' : 'any');
            const ops = isTuringRule(rule) ? rule.ops.join(', ') : `${rule.write}, ${rule.move}`;
            const isActive = active === index;
            return (
              <tr
                key={line.ruleIndex}
                tabIndex={0}
                data-active={isActive ? 'true' : undefined}
                onFocus={() => setActive(index)}
                onBlur={() => leave(index)}
                onMouseEnter={() => setActive(index)}
                onMouseLeave={() => leave(index)}
                className={`cursor-default border-b border-soft align-top focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ink ${
                  isActive ? 'bg-row-now outline-2 outline-offset-[-2px] outline-ink' : ''
                }`}
              >
                <th scope="row" className="py-2 pr-2 pl-1 font-normal">
                  {rule.state}
                </th>
                <td className="py-2 pr-2">{read}</td>
                <td className="py-2 pr-2">{ops}</td>
                <td className="py-2 pr-2">{rule.next}</td>
                <td className="py-2 pr-1">
                  <span className="block text-sm text-muted">{line.standardForm}</span>
                  <span className="block font-mono break-all">{line.sd}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <dl className="mt-5 space-y-4">
        <div>
          <dt className="font-semibold">{t('sd')}</dt>
          <Parts parts={encoding.lines.map((line) => line.sd)} active={active} testId="encoding-sd" />
        </div>
        <div>
          <dt className="font-semibold">{t('dn')}</dt>
          <Parts parts={encoding.lines.map((line) => line.dn)} active={active} testId="encoding-dn" />
        </div>
      </dl>
    </figure>
  );
}
