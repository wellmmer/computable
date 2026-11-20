'use client';

import { useEffect, useReducer, useRef, useState, useSyncExternalStore } from 'react';
import { ROTOR_ORDERS } from '@/engines/bombe';
import type { RotorName, Three } from '@/engines/enigma';
import { useReducedMotion } from '@/simulator/components/use-reduced-motion';
import { CribCard } from './CribCard';
import { DrumWall } from './DrumWall';
import { blocker, bombeReducer, cribLetters, initialLab, menuOf, secretLetters } from './lab-state';
import { MenuCard } from './MenuCard';
import { ordersToSearch, readTestOrders } from './search-orders';
import { StopsCard } from './StopsCard';
import { workerSearch, type SearchRunner } from './worker-search';

/** The page never changes "hydrated" after the first render, so nothing needs a subscription. */
const noSubscription = () => () => {};

/**
 * The Bombe lab (spec R4 3, layout B). From 768 px, the drum wall sits on the left and the cards on
 * the right. On phones, the page order is crib, menu, drum wall, stops. The search runs in a Web
 * Worker; tests hand in another `search`.
 */
export function BombeLab({ search = workerSearch }: { search?: SearchRunner }) {
  const [lab, dispatch] = useReducer(bombeReducer, undefined, initialLab);
  const [orders, setOrders] = useState<readonly Three<RotorName>[]>(ROTOR_ORDERS);
  const stopSearch = useRef<(() => void) | null>(null);
  const reducedMotion = useReducedMotion();
  // The buttons work only after React loads. End-to-end tests wait for data-bombe="ready".
  const hydrated = useSyncExternalStore(noSubscription, () => true, () => false);
  const menu = menuOf(lab);

  const end = () => {
    stopSearch.current?.();
    stopSearch.current = null;
  };

  // Leaving the page ends the worker.
  useEffect(() => () => stopSearch.current?.(), []);

  const start = () => {
    end();
    const next = ordersToSearch(readTestOrders());
    setOrders(next);
    dispatch({ type: 'start', total: next.length });
    stopSearch.current = search({ cipher: secretLetters(lab), crib: cribLetters(lab), offset: lab.offset, orders: next }, (report) => {
      dispatch({ type: 'report', report });
      if (report.type === 'finished') end();
    });
  };

  const stop = () => {
    end();
    dispatch({ type: 'stop' });
  };

  return (
    <div data-bombe={hydrated ? 'ready' : undefined} className="mt-6 grid gap-4 md:grid-cols-[1.2fr_1fr] md:items-start">
      <div className="md:col-start-2 md:row-start-1">
        <CribCard lab={lab} dispatch={dispatch} />
      </div>
      <div className="md:col-start-2 md:row-start-2">
        <MenuCard menu={menu} />
      </div>
      <div className="md:col-start-1 md:row-span-3 md:row-start-1">
        <DrumWall menu={menu} search={lab.search} orders={orders} reducedMotion={reducedMotion} blocked={blocker(lab)} onStart={start} onStop={stop} />
      </div>
      <div className="md:col-start-2 md:row-start-3">
        <StopsCard search={lab.search} cipher={secretLetters(lab)} />
      </div>
    </div>
  );
}
