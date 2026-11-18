'use client';

import { RotateCcw, StepForward, type LucideIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useId, useRef, useState, useSyncExternalStore, type RefObject } from 'react';
import { LiveRegion } from '@/simulator/components/LiveRegion';
import { SimulatorStoreProvider, useSimulator, useSimulatorStore } from '@/simulator/components/store-context';
import { TapeStage } from '@/simulator/components/TapeStage';
import { useReducedMotion } from '@/simulator/components/use-reduced-motion';
import { createSimulatorStore } from '@/simulator/store';
import { createMemoryStorage } from '@/storage/machine-storage';
import { moveTo, partsReached, readingLine, tapeMode, type TapeMode } from './paper-tape';

const noSubscription = () => () => {};

/** "static" in the server's HTML and during hydration, then the mode this browser gets. */
function useTapeMode(): TapeMode {
  const reducedMotion = useReducedMotion();
  const hydrated = useSyncExternalStore(noSubscription, () => true, () => false);
  if (!hydrated) return 'static';
  return tapeMode({ reducedMotion, observer: typeof IntersectionObserver === 'function' });
}

/** Moves the machine to the number of parts reached, each time a part crosses the reading line. */
function useScrollSteps(mode: TapeMode, tapeRef: RefObject<HTMLElement | null>) {
  const store = useSimulatorStore();
  useEffect(() => {
    if (mode !== 'scroll') return;
    const parts = [...document.querySelectorAll<HTMLElement>('[data-paper-part]')];
    // A sticky tape sits at the top of the window, so its bottom edge is at its height.
    const line = () => {
      const tape = tapeRef.current;
      const sticky = tape !== null && getComputedStyle(tape).position === 'sticky';
      return readingLine({ windowHeight: window.innerHeight, stickyTapeHeight: sticky ? tape.offsetHeight : null });
    };
    const follow = () => moveTo(store, partsReached(parts.map((part) => part.getBoundingClientRect().top), line()));
    let observer: IntersectionObserver | null = null;
    // The observed area ends at the reading line, so the browser calls back when a part's top crosses it.
    // The line moves when the window changes size, so the observer is made again then.
    const observe = () => {
      observer?.disconnect();
      observer = new IntersectionObserver(follow, { rootMargin: `0px 0px -${Math.max(0, window.innerHeight - line())}px 0px` });
      for (const part of parts) observer.observe(part);
    };
    observe();
    window.addEventListener('resize', observe);
    return () => {
      window.removeEventListener('resize', observe);
      observer?.disconnect();
    };
  }, [mode, store, tapeRef]);
}

function TapeButton({ icon: Icon, label, onClick }: { icon: LucideIcon; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-9 items-center gap-1.5 border-2 border-ink bg-cell px-3 text-sm font-semibold text-ink active:translate-y-px"
    >
      <Icon aria-hidden className="size-4" />
      {label}
    </button>
  );
}

function TapeRow({ mode, nameId, name }: { mode: TapeMode; nameId: string; name: string }) {
  const t = useTranslations('learn.paper.tape');
  const tControls = useTranslations('simulator.controls');
  const actions = useSimulator((s) => s);
  const steps = useSimulator((s) => s.run?.history.length ?? 0);
  useSimulator((s) => s.version);
  return (
    // One row of fixed height in every mode, so the page below never moves when the buttons appear.
    <div className="flex h-12 items-center justify-between gap-3">
      <p className="flex min-w-0 items-baseline gap-3">
        <span className="shrink-0 font-semibold">{t('step', { step: steps })}</span>
        <span id={nameId} className="truncate text-sm text-muted">
          {name}
        </span>
      </p>
      {mode === 'buttons' && (
        <div className="flex shrink-0 gap-2">
          <TapeButton icon={RotateCcw} label={tControls('reset')} onClick={actions.reset} />
          <TapeButton icon={StepForward} label={tControls('step')} onClick={actions.stepForward} />
        </div>
      )}
    </div>
  );
}

function TapeFigure() {
  const tMachine = useTranslations('learn.machine');
  const tExamples = useTranslations('simulator.examples');
  const nameId = useId();
  const mode = useTapeMode();
  const tapeRef = useRef<HTMLElement>(null);
  useScrollSteps(mode, tapeRef);
  const name = tExamples('turing-1936');
  return (
    // The tape is about 226 px tall. It sticks only on a window at least 35rem (560 px) tall, where it
    // takes at most 40% of the screen. On a phone held sideways it would take more than half, so there
    // it scrolls away with the page.
    <figure
      ref={tapeRef}
      aria-labelledby={nameId}
      data-testid="paper-tape"
      className="top-0 z-20 -mx-4 border-y-2 border-ink bg-paper px-4 pt-1 sm:mx-0 sm:border-2 sm:px-5 [@media(min-height:35rem)]:sticky"
    >
      {/* The tape keeps its height; only its top margin goes, so the sticky bar stays short on a phone. */}
      <div className="[&>section]:mt-0">
        <TapeStage editable={false} label={tMachine('tape', { name })} />
      </div>
      <TapeRow mode={mode} nameId={nameId} name={name} />
      {/* A button press is spoken once. Scrolling is not: a step per part would be noise. */}
      {mode === 'buttons' && <LiveRegion />}
    </figure>
  );
}

/**
 * The tape of the reading guide (spec R2c 3). It stays at the top of the screen and runs Turing's
 * first machine: one step for each part of the paper the visitor reaches. With reduced motion, or
 * without IntersectionObserver, it shows Step and Reset instead. Its store keeps nothing.
 */
export function PaperTape() {
  const [store] = useState(() => {
    const created = createSimulatorStore({ storage: createMemoryStorage() });
    created.getState().loadExample('turing-1936');
    return created;
  });
  return (
    <SimulatorStoreProvider store={store}>
      <TapeFigure />
    </SimulatorStoreProvider>
  );
}
