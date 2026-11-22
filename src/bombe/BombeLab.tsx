'use client';

import { useEffect, useReducer, useRef, useState, useSyncExternalStore } from 'react';
import { ROTOR_ORDERS } from '@/engines/bombe';
import type { RotorName, Three } from '@/engines/enigma';
import { MY_SECRET_HASH } from '@/home/secret-link';
import { readSecret, useSecret } from '@/home/use-secret';
import { useReducedMotion } from '@/simulator/components/use-reduced-motion';
import { CribCard } from './CribCard';
import { DrumWall } from './DrumWall';
import { blocker, bombeReducer, cribLetters, initialLab, menuOf, secretLetters } from './lab-state';
import { MenuCard } from './MenuCard';
import { SlowTestCard } from './SlowTestCard';
import { ordersToSearch, readTestOrders } from './search-orders';
import { StopsCard } from './StopsCard';
import { workerSearch, type SearchRunner } from './worker-search';

/** The page never changes "hydrated" after the first render, so nothing needs a subscription. */
const noSubscription = () => () => {};

/**
 * The Bombe lab (spec R4 3, layout B). From 768 px, the drum wall sits on the left and the cards on
 * the right. On phones, the page order is crib, menu, drum wall, stops. The search runs in a Web
 * Worker; tests hand in another `search`. Home's "Break it with the Bombe" fills the secret letters,
 * and a stop that matches the saved key says so (spec R4 4). Slow step mode sits under the drum wall.
 */
export function BombeLab({ search = workerSearch }: { search?: SearchRunner }) {
  const [lab, dispatch] = useReducer(bombeReducer, undefined, initialLab);
  const [orders, setOrders] = useState<readonly Three<RotorName>[]>(ROTOR_ORDERS);
  const stopSearch = useRef<(() => void) | null>(null);
  // Each search gets a new number. A late report from an older search is ignored.
  const searchId = useRef(0);
  const reducedMotion = useReducedMotion();
  // The buttons work only after React loads. End-to-end tests wait for data-bombe="ready".
  const hydrated = useSyncExternalStore(noSubscription, () => true, () => false);
  const menu = menuOf(lab);
  const secret = useSecret();
  const slowStep = lab.slow?.steps[lab.slow.at];
  const activeLink = slowStep?.kind === 'link' ? slowStep.link : null;

  const end = () => {
    stopSearch.current?.();
    stopSearch.current = null;
  };

  // Leaving the page ends the worker.
  useEffect(() => () => stopSearch.current?.(), []);

  const running = lab.search.status === 'running';

  // Home's "Break it with the Bombe" fills the secret letters from this browser. The key stays out of the address.
  // The lab ignores new secret letters while a search runs. So the link waits in the address, and this effect reads it when the search ends.
  useEffect(() => {
    if (running) return;
    const openLink = () => {
      if (window.location.hash !== MY_SECRET_HASH) return;
      const saved = readSecret();
      if (saved === null || saved.cipher === '') return;
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
      dispatch({ type: 'load-secret', cipher: saved.cipher });
    };
    openLink();
    window.addEventListener('hashchange', openLink);
    return () => window.removeEventListener('hashchange', openLink);
  }, [running]);

  const start = () => {
    end();
    const next = ordersToSearch(readTestOrders());
    setOrders(next);
    dispatch({ type: 'start', total: next.length });
    const id = ++searchId.current;
    stopSearch.current = search({ cipher: secretLetters(lab), crib: cribLetters(lab), offset: lab.offset, orders: next }, (report) => {
      if (id !== searchId.current) return;
      dispatch({ type: 'report', report });
      if (report.type === 'finished' || report.type === 'failed') end();
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
        <MenuCard menu={menu} activeLink={activeLink} />
      </div>
      <div className="grid gap-4 md:col-start-1 md:row-span-3 md:row-start-1">
        <DrumWall
          menu={menu}
          search={lab.search}
          orders={orders}
          reducedMotion={reducedMotion}
          blocked={blocker(lab)}
          onStart={start}
          onStop={stop}
          slow={lab.slow === null ? null : { rotors: lab.slow.rotors, start: lab.slow.start, link: activeLink }}
        />
        <SlowTestCard lab={lab} orders={orders} dispatch={dispatch} />
      </div>
      <div className="md:col-start-2 md:row-start-3">
        <StopsCard search={lab.search} cipher={secretLetters(lab)} yourKey={secret ?? null} />
      </div>
    </div>
  );
}
