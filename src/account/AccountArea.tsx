'use client';

import { useEffect, useState } from 'react';
import type { AccountClient } from './account-client';
import { AccountMenu } from './AccountMenu';
import { loadAccountClient } from './load-account';

/**
 * The account part of the menu bar. It loads the account client after the page starts, and shows
 * nothing when the 2 Supabase values are not set (spec R5b 2). Then the site works as before.
 */
export function AccountArea() {
  const [client, setClient] = useState<AccountClient | null>(null);

  useEffect(() => {
    let current = true;
    void loadAccountClient().then((loaded) => {
      if (current) setClient(loaded);
    });
    return () => {
      current = false;
    };
  }, []);

  return client === null ? null : <AccountMenu client={client} />;
}
