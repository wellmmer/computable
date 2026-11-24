import { createClient, type User } from '@supabase/supabase-js';
import type { AccountClient, AccountUser } from './account-client';
import type { AccountConfig } from './config';

/** The address parts that Supabase adds when a sign-in fails or is cancelled. */
const ERROR_KEYS = ['error', 'error_code', 'error_description'];

function textOf(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

/** Google gives `full_name` and `name`. GitHub gives `full_name`, or `name` alone. */
function toAccountUser(user: User): AccountUser {
  const metadata: Record<string, unknown> = user.user_metadata ?? {};
  return { name: textOf(metadata.full_name) ?? textOf(metadata.name), email: textOf(user.email) };
}

/** Removes the sign-in error from the address, so a reload does not show it again. A share link after the # sign stays. */
function removeErrorFromAddress() {
  const url = new URL(window.location.href);
  for (const key of ERROR_KEYS) url.searchParams.delete(key);
  const hash = new URLSearchParams(url.hash.slice(1));
  if (ERROR_KEYS.some((key) => hash.has(key))) {
    for (const key of ERROR_KEYS) hash.delete(key);
    url.hash = hash.toString();
  }
  window.history.replaceState(window.history.state, '', url.toString());
}

/**
 * The account service on Supabase Auth (spec R5b 4). By default, supabase-js keeps the session in
 * localStorage and sets no cookie. The PKCE flow sends a code back to the page, and the client
 * trades it for a session when it starts.
 */
export function createSupabaseAccountClient(config: AccountConfig): AccountClient {
  const supabase = createClient(config.url, config.anonKey, { auth: { flowType: 'pkce' } });

  return {
    onUserChange(listener) {
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        listener(session === null ? null : toAccountUser(session.user));
      });
      return () => data.subscription.unsubscribe();
    },
    async signInFailedOnReturn() {
      const { error } = await supabase.auth.initialize();
      if (error === null) return false;
      removeErrorFromAddress();
      return true;
    },
    async signInWith(provider) {
      try {
        const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: window.location.href } });
        return error === null;
      } catch {
        return false;
      }
    },
    async signOut() {
      await supabase.auth.signOut({ scope: 'local' });
    },
    async deleteAccount() {
      try {
        const { error } = await supabase.rpc('delete_my_account');
        if (error !== null) return false;
      } catch {
        return false;
      }
      await supabase.auth.signOut({ scope: 'local' });
      return true;
    },
  };
}
