import type { AccountClient } from './account-client';
import { accountConfig } from './config';

let loading: Promise<AccountClient | null> | null = null;

/**
 * Returns the account client of the page, or null when the 2 Supabase values are not set.
 * It loads the Supabase code only when they are set, so the site without accounts stays as small as today.
 * Every caller gets the same client, because 2 clients would each try to renew the session.
 */
export function loadAccountClient(): Promise<AccountClient | null> {
  if (loading === null) {
    const config = accountConfig();
    loading =
      config === null
        ? Promise.resolve(null)
        : import('./supabase-account').then(({ createSupabaseAccountClient }) => createSupabaseAccountClient(config));
  }
  return loading;
}
