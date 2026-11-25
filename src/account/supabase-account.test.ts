// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AccountUser } from './account-client';
import { createSupabaseAccountClient } from './supabase-account';

/** A fake of the parts of the Supabase client that the adapter uses. No network. */
const supabase = vi.hoisted(() => {
  type Session = { user: { email?: string; user_metadata: Record<string, unknown> } } | null;
  const state: { listener: ((event: string, session: Session) => void) | null } = { listener: null };
  const unsubscribe = vi.fn();
  const auth = {
    onAuthStateChange: vi.fn((listener: (event: string, session: Session) => void) => {
      state.listener = listener;
      return { data: { subscription: { unsubscribe } } };
    }),
    initialize: vi.fn(async (): Promise<{ error: Error | null }> => ({ error: null })),
    signInWithOAuth: vi.fn(async (): Promise<{ error: Error | null }> => ({ error: null })),
    signOut: vi.fn(async (): Promise<{ error: Error | null }> => ({ error: null })),
  };
  const client = { auth, rpc: vi.fn(async (): Promise<{ error: Error | null }> => ({ error: null })) };
  return { state, unsubscribe, client, createClient: vi.fn(() => client) };
});

vi.mock('@supabase/supabase-js', () => ({ createClient: supabase.createClient }));

const CONFIG = { url: 'https://example.supabase.co', anonKey: 'public-key' };

beforeEach(() => {
  vi.clearAllMocks();
  window.history.replaceState(null, '', '/en/simulator');
});

afterEach(() => {
  supabase.state.listener = null;
});

describe('createSupabaseAccountClient (spec R5b 4)', () => {
  it('creates the Supabase client with the PKCE flow, so the browser trades the returned code for a session', () => {
    createSupabaseAccountClient(CONFIG);
    expect(supabase.createClient).toHaveBeenCalledWith('https://example.supabase.co', 'public-key', { auth: { flowType: 'pkce' } });
  });

  it('opens the sign-in page of the service and asks to come back to the same page', async () => {
    window.history.replaceState(null, '', '/pt-br/enigma?x=1');
    const account = createSupabaseAccountClient(CONFIG);
    expect(await account.signInWith('github')).toBe(true);
    expect(supabase.client.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'github',
      options: { redirectTo: 'http://localhost:3000/pt-br/enigma?x=1' },
    });
  });

  it('says false when the sign-in page cannot open', async () => {
    supabase.client.auth.signInWithOAuth.mockResolvedValueOnce({ error: new Error('refused') });
    expect(await createSupabaseAccountClient(CONFIG).signInWith('google')).toBe(false);
  });

  it('reports the name, then the email, of the signed-in person, and null after a sign-out', () => {
    const seen: (AccountUser | null)[] = [];
    const stop = createSupabaseAccountClient(CONFIG).onUserChange((user) => seen.push(user));
    const emit = supabase.state.listener;
    if (emit === null) throw new Error('The adapter did not listen.');
    emit('SIGNED_IN', { user: { email: 'a@example.test', user_metadata: { full_name: 'Ada L', name: 'ada' } } });
    emit('USER_UPDATED', { user: { email: 'a@example.test', user_metadata: { name: 'ada' } } });
    emit('USER_UPDATED', { user: { email: 'a@example.test', user_metadata: { full_name: '  ', name: 7 } } });
    emit('SIGNED_OUT', null);
    expect(seen).toEqual([
      { name: 'Ada L', email: 'a@example.test' },
      { name: 'ada', email: 'a@example.test' },
      { name: null, email: 'a@example.test' },
      null,
    ]);
    stop();
    expect(supabase.unsubscribe).toHaveBeenCalledOnce();
  });

  it('says the sign-in did not finish when the return address holds an error, and removes the error from it', async () => {
    window.history.replaceState(null, '', '/en/about?error=access_denied&error_code=403&error_description=Denied&keep=1#m=abc');
    supabase.client.auth.initialize.mockResolvedValueOnce({ error: new Error('Denied') });
    expect(await createSupabaseAccountClient(CONFIG).signInFailedOnReturn()).toBe(true);
    expect(window.location.pathname + window.location.search + window.location.hash).toBe('/en/about?keep=1#m=abc');
  });

  it('removes an error that came after the # sign', async () => {
    window.history.replaceState(null, '', '/en/about#error=access_denied&error_description=Denied');
    supabase.client.auth.initialize.mockResolvedValueOnce({ error: new Error('Denied') });
    expect(await createSupabaseAccountClient(CONFIG).signInFailedOnReturn()).toBe(true);
    expect(window.location.pathname + window.location.search + window.location.hash).toBe('/en/about');
  });

  it('removes the code and the flow ID from the address after a failed code exchange', async () => {
    window.history.replaceState(null, '', '/en/about?code=used-code&sb_flow_id=flow-1&keep=1#m=abc');
    supabase.client.auth.initialize.mockResolvedValueOnce({ error: new Error('Code already used') });
    expect(await createSupabaseAccountClient(CONFIG).signInFailedOnReturn()).toBe(true);
    expect(window.location.pathname + window.location.search + window.location.hash).toBe('/en/about?keep=1#m=abc');
  });

  it('says nothing failed on a normal page load', async () => {
    expect(await createSupabaseAccountClient(CONFIG).signInFailedOnReturn()).toBe(false);
  });

  it('signs out in this browser only', async () => {
    await createSupabaseAccountClient(CONFIG).signOut();
    expect(supabase.client.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
  });

  it('deletes the account with delete_my_account(), then signs out', async () => {
    expect(await createSupabaseAccountClient(CONFIG).deleteAccount()).toBe(true);
    expect(supabase.client.rpc).toHaveBeenCalledWith('delete_my_account');
    expect(supabase.client.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
  });

  it('says false and stays signed in when the deletion fails', async () => {
    supabase.client.rpc.mockResolvedValueOnce({ error: new Error('down') });
    expect(await createSupabaseAccountClient(CONFIG).deleteAccount()).toBe(false);
    expect(supabase.client.auth.signOut).not.toHaveBeenCalled();
  });

  it('says false when the network fails during the deletion', async () => {
    supabase.client.rpc.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    expect(await createSupabaseAccountClient(CONFIG).deleteAccount()).toBe(false);
  });
});
