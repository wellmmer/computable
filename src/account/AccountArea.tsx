'use client';

import { useEffect, useRef, useState } from 'react';
import { sharedBrowserValues } from '@/storage/synced-key-value';
import type { AccountClient } from './account-client';
import { AccountMenu } from './AccountMenu';
import { loadAccountClient } from './load-account';
import { MachineChoiceDialog } from './sync/MachineChoiceDialog';
import { createSyncEngine, type MachineConflict, type SyncEngine, type SyncStatus } from './sync/sync-engine';

/**
 * The account part of the menu bar. It loads the account client after the page starts, and shows
 * nothing when the 2 Supabase values are not set (spec R5b 2). Then the site works as before.
 * While a person is signed in, it runs the sync and shows the machine dialog when needed (spec R5b 5).
 */
export function AccountArea() {
  const [client, setClient] = useState<AccountClient | null>(null);
  const [status, setStatus] = useState<SyncStatus>('saving');
  const [conflict, setConflict] = useState<MachineConflict | null>(null);
  const engine = useRef<SyncEngine | null>(null);

  useEffect(() => {
    let current = true;
    void loadAccountClient().then((loaded) => {
      if (current) setClient(loaded);
    });
    return () => {
      current = false;
    };
  }, []);

  // One sync per login. Supabase also reports a renewed token, with the same person: the sync goes on.
  useEffect(() => {
    if (client === null) return;
    let userId: string | null = null;
    const stopSync = () => {
      engine.current?.stop();
      engine.current = null;
      setConflict(null);
    };
    const stopListening = client.onUserChange((user) => {
      const nextId = user?.id ?? null;
      if (nextId === userId) return;
      stopSync();
      userId = nextId;
      if (nextId === null) return;
      const started = createSyncEngine({ userId: nextId, client, values: sharedBrowserValues(), onStatus: setStatus, onConflict: setConflict });
      engine.current = started;
      setStatus('saving');
      void started.start();
    });
    return () => {
      stopListening();
      stopSync();
    };
  }, [client]);

  if (client === null) return null;
  return (
    <>
      <AccountMenu client={client} status={status} />
      {conflict !== null && (
        <MachineChoiceDialog
          conflict={conflict}
          onKeepBrowser={() => void engine.current?.keepBrowserMachine()}
          onUseSaved={() => engine.current?.useSavedMachine()}
        />
      )}
    </>
  );
}
