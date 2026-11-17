'use client';

import { ArrowUpRight, Pause, Play, RotateCcw, StepForward, type LucideIcon } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useId, useState } from 'react';
import { getPathname } from '@/i18n/navigation';
import { shareUrl } from '@/share/share-link';
import { textLink } from '@/shell/page-styles';
import { LiveRegion } from '@/simulator/components/LiveRegion';
import { ResultLine } from '@/simulator/components/ResultLine';
import { StepSentence } from '@/simulator/components/StepSentence';
import { SimulatorStoreProvider, useSimulator } from '@/simulator/components/store-context';
import { TapeStage } from '@/simulator/components/TapeStage';
import { examples, type ExampleId } from '@/simulator/examples';
import { createSimulatorStore } from '@/simulator/store';
import { createMemoryStorage } from '@/storage/machine-storage';

function MachineButton({ icon: Icon, label, onClick, disabled, primary }: { icon: LucideIcon; label: string; onClick: () => void; disabled?: boolean; primary?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 border-2 border-ink px-4 py-2 font-semibold active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 ${
        primary ? 'min-w-28 bg-ink text-paper' : 'bg-cell text-ink'
      }`}
    >
      <Icon aria-hidden className="size-4" />
      {label}
    </button>
  );
}

/** Reset, Run/Pause and Step. No keyboard shortcuts: a lesson page can hold several machines. */
function MachineControls() {
  const t = useTranslations('simulator.controls');
  const run = useSimulator((s) => s.run);
  const loop = useSimulator((s) => s.loop);
  const actions = useSimulator((s) => s);
  useSimulator((s) => s.version);
  const running = loop === 'running';
  return (
    <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
      <MachineButton icon={RotateCcw} label={t('reset')} onClick={actions.reset} disabled={run === null} />
      <MachineButton icon={running ? Pause : Play} label={running ? t('pause') : t('run')} onClick={actions.toggleRun} disabled={run === null} primary />
      <MachineButton icon={StepForward} label={t('step')} onClick={actions.stepForward} disabled={run === null || run.status !== 'running'} />
    </div>
  );
}

/**
 * The mini-simulator inside a lesson (spec 2.3): the tape, the step sentence, Step, Run/Pause and
 * Reset. It has a store of its own that keeps nothing, so the machine the visitor saved in the
 * simulator stays untouched. It never runs by itself, so reduced motion needs no special case.
 */
export function LessonMachine({ example }: { example: ExampleId }) {
  const t = useTranslations('learn.machine');
  const tExamples = useTranslations('simulator.examples');
  const locale = useLocale();
  const captionId = useId();
  const [store] = useState(() => {
    const created = createSimulatorStore({ storage: createMemoryStorage() });
    created.getState().loadExample(example);
    return created;
  });

  // Leaving the page stops a running machine.
  useEffect(() => () => store.getState().pause(), [store]);

  const name = tExamples(example);
  const link = shareUrl(getPathname({ href: '/simulator', locale }), examples[example].machine);

  return (
    <SimulatorStoreProvider store={store}>
      <figure aria-labelledby={captionId} className="mt-8 border-2 border-ink bg-cell px-3 pt-3 pb-5">
        <figcaption id={captionId} className="font-display text-lg font-semibold">
          {name}
        </figcaption>
        <TapeStage editable={false} label={t('tape', { name })} />
        <StepSentence />
        <MachineControls />
        <ResultLine />
        {link.ok && (
          <p className="mt-4 text-center">
            <a href={link.url} className={`inline-flex items-center gap-1.5 ${textLink}`}>
              {t('open')}
              <ArrowUpRight aria-hidden className="size-4" />
            </a>
          </p>
        )}
        <LiveRegion />
      </figure>
    </SimulatorStoreProvider>
  );
}
