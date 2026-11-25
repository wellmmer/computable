import { createClient, type User } from '@supabase/supabase-js';
import { z } from 'zod';
import { AccountSignedOutError, type AccountClient, type AccountUser, type ProfilePatch, type WriteResult } from './account-client';
import type { AccountConfig } from './config';

/** The synced columns of a row, as PostgREST sends them. */
const rowSchema = z.object({
  machine: z.unknown(),
  machine_changed_at: z.string().nullable(),
  progress: z.unknown(),
  progress_reset_at: z.string().nullable(),
});

/** The Postgres code of a broken check constraint: here, the size limit of a column. */
const CHECK_VIOLATION = '23514';

/**
 * The codes that mean the login is not valid any more. PostgREST gives PGRST301 for a bad token and
 * PGRST303 for an expired one. Without a login the request runs as `anon`, which has no access to
 * the table, so Postgres gives 42501.
 */
const SIGNED_OUT_CODES = new Set(['PGRST301', 'PGRST303', '42501']);

/** True when a failed request says the login is not valid any more. */
function isSignedOut(error: { code: string }, status: number): boolean {
  return status === 401 || SIGNED_OUT_CODES.has(error.code);
}

/** Maps a failed write to what the sync does next. */
function toWriteResult(error: { code: string }, status: number): WriteResult {
  if (error.code === CHECK_VIOLATION) return 'too-big';
  return isSignedOut(error, status) ? 'signed-out' : 'offline';
}

/** The row columns for a patch. A column that is not in the patch stays out, so the write leaves it as it is. */
function toRowColumns(patch: ProfilePatch): Record<string, unknown> {
  const columns: Record<string, unknown> = {};
  if ('machine' in patch) columns.machine = patch.machine;
  if ('machineChangedAt' in patch) columns.machine_changed_at = patch.machineChangedAt;
  if ('progress' in patch) columns.progress = patch.progress;
  if ('progressResetAt' in patch) columns.progress_reset_at = patch.progressResetAt;
  return columns;
}

/** The address parts that Supabase adds when a sign-in fails or is cancelled. */
const ERROR_KEYS = ['error', 'error_code', 'error_description'];

/**
 * The address parts of a PKCE return: the code, and the flow ID that auth-js 2.119.0 adds to the
 * return address. auth-js removes them only after a code exchange that worked.
 */
const CODE_KEYS = ['code', 'sb_flow_id'];

function textOf(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

/** Google gives `full_name` and `name`. GitHub gives `full_name`, or `name` alone. */
function toAccountUser(user: User): AccountUser {
  const metadata: Record<string, unknown> = user.user_metadata ?? {};
  return { id: user.id, name: textOf(metadata.full_name) ?? textOf(metadata.name), email: textOf(user.email) };
}

/**
 * Removes the sign-in error, the code and the flow ID from the address, so a reload does not try
 * the code again or show the error again. A share link after the # sign stays.
 */
function removeFailedReturnFromAddress() {
  const url = new URL(window.location.href);
  for (const key of [...ERROR_KEYS, ...CODE_KEYS]) url.searchParams.delete(key);
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
  /** True while "Sign out" or "Delete my account" signs the person out. Then the sign-out is not a lost session. */
  let signingOut = false;

  /** Signs out in this browser. auth-js tells the listeners before this resolves. */
  const signOutHere = async () => {
    signingOut = true;
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } finally {
      signingOut = false;
    }
  };

  return {
    onUserChange(listener) {
      let signedIn = false;
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        const user = session === null ? null : toAccountUser(session.user);
        const lost = signedIn && user === null && !signingOut;
        signedIn = user !== null;
        listener(user, lost);
      });
      return () => data.subscription.unsubscribe();
    },
    async signInFailedOnReturn() {
      const { error } = await supabase.auth.initialize();
      if (error === null) return false;
      removeFailedReturnFromAddress();
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
    signOut: signOutHere,
    async deleteAccount() {
      try {
        const { error } = await supabase.rpc('delete_my_account');
        if (error !== null) return false;
      } catch {
        return false;
      }
      await signOutHere();
      return true;
    },
    async readProfile(userId) {
      const { data, error, status } = await supabase
        .from('profiles')
        .select('machine, machine_changed_at, progress, progress_reset_at')
        .eq('user_id', userId)
        .maybeSingle();
      if (error !== null) throw isSignedOut(error, status) ? new AccountSignedOutError() : new Error(error.message);
      if (data === null) return null;
      const row = rowSchema.safeParse(data);
      if (!row.success) throw new Error('The row does not have the synced columns.');
      return {
        machine: row.data.machine ?? null,
        machineChangedAt: row.data.machine_changed_at,
        progress: row.data.progress,
        progressResetAt: row.data.progress_reset_at,
      };
    },
    async writeProfile(userId, patch) {
      try {
        const { error, status } = await supabase
          .from('profiles')
          .upsert({ user_id: userId, updated_at: new Date().toISOString(), ...toRowColumns(patch) }, { onConflict: 'user_id' });
        return error === null ? 'ok' : toWriteResult(error, status);
      } catch {
        return 'offline';
      }
    },
  };
}
