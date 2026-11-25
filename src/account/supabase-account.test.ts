// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AccountSignedOutError, type AccountUser } from './account-client';
import { createSupabaseAccountClient } from './supabase-account';

/** A fake of the parts of the Supabase client that the adapter uses. No network. */
const supabase = vi.hoisted(() => {
  type Session = { user: { id: string; email?: string; user_metadata: Record<string, unknown> } } | null;
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
  /** A PostgREST answer: the row or nothing, an error with its code, and the HTTP status. */
  type Answer = { data: unknown; error: { code: string; message: string } | null; status: number };
  // The query builder of `from('profiles')`. Each method records its arguments.
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    maybeSingle: vi.fn(async (): Promise<Answer> => ({ data: null, error: null, status: 200 })),
    upsert: vi.fn(async (): Promise<Answer> => ({ data: null, error: null, status: 201 })),
  };
  const client = {
    auth,
    rpc: vi.fn(async (): Promise<{ error: Error | null }> => ({ error: null })),
    from: vi.fn(() => query),
  };
  return { state, unsubscribe, client, query, createClient: vi.fn(() => client) };
});

vi.mock('@supabase/supabase-js', () => ({ createClient: supabase.createClient }));

const CONFIG = { url: 'https://example.supabase.co', anonKey: 'public-key' };

beforeEach(() => {
  vi.clearAllMocks();
  // "Sign out" leaves a time in localStorage for the other tabs. Each test starts without it.
  localStorage.clear();
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
    emit('SIGNED_IN', { user: { id: 'id-a', email: 'a@example.test', user_metadata: { full_name: 'Ada L', name: 'ada' } } });
    emit('USER_UPDATED', { user: { id: 'id-a', email: 'a@example.test', user_metadata: { name: 'ada' } } });
    emit('USER_UPDATED', { user: { id: 'id-a', email: 'a@example.test', user_metadata: { full_name: '  ', name: 7 } } });
    emit('SIGNED_OUT', null);
    expect(seen).toEqual([
      { id: 'id-a', name: 'Ada L', email: 'a@example.test' },
      { id: 'id-a', name: 'ada', email: 'a@example.test' },
      { id: 'id-a', name: null, email: 'a@example.test' },
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

describe('the sign-out reason (spec R5b 6)', () => {
  const ADA = { user: { id: 'id-a', email: 'a@example.test', user_metadata: {} } };

  /** Listens to the client and returns what it reported: the user ID or null, and the lost flag. */
  function listen() {
    const account = createSupabaseAccountClient(CONFIG);
    const seen: [string | null, boolean][] = [];
    account.onUserChange((user, lost) => seen.push([user?.id ?? null, lost]));
    const emit = supabase.state.listener;
    if (emit === null) throw new Error('The adapter did not listen.');
    return { account, seen, emit };
  }

  it('says the session was lost when Supabase signs the person out by itself', () => {
    const { seen, emit } = listen();
    emit('INITIAL_SESSION', ADA);
    emit('SIGNED_OUT', null);
    expect(seen).toEqual([
      ['id-a', false],
      [null, true],
    ]);
  });

  it('does not say so when nobody was signed in', () => {
    const { seen, emit } = listen();
    emit('INITIAL_SESSION', null);
    expect(seen).toEqual([[null, false]]);
  });

  it('does not say so after "Sign out" or "Delete my account"', async () => {
    const { account, seen, emit } = listen();
    // auth-js tells its listeners about the sign-out before signOut() resolves.
    const signOutWithEvent = async () => {
      emit('SIGNED_OUT', null);
      return { error: null };
    };
    supabase.client.auth.signOut.mockImplementationOnce(signOutWithEvent).mockImplementationOnce(signOutWithEvent);
    emit('SIGNED_IN', ADA);
    await account.signOut();
    emit('SIGNED_IN', ADA);
    await account.deleteAccount();
    emit('SIGNED_IN', ADA);
    // A minute later, a sign-out that no button started is a lost session again.
    localStorage.setItem('computable.signOutAt', String(Date.now() - 60_000));
    emit('SIGNED_OUT', null);
    expect(seen.map(([, lost]) => lost)).toEqual([false, false, false, false, false, true]);
  });
});

describe('a sign-out in another tab (spec R5b 6)', () => {
  const ADA = { user: { id: 'id-a', email: 'a@example.test', user_metadata: {} } };

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  /** 2 tabs of the same browser: each has its own client, and both share localStorage. */
  function twoTabs() {
    const first = createSupabaseAccountClient(CONFIG);
    const second = createSupabaseAccountClient(CONFIG);
    const seen: boolean[] = [];
    second.onUserChange((_user, lost) => seen.push(lost));
    const emitInSecond = supabase.state.listener;
    if (emitInSecond === null) throw new Error('The adapter did not listen.');
    emitInSecond('INITIAL_SESSION', ADA);
    return { first, seen, emitInSecond };
  }

  it('is not a lost session when "Sign out" in another tab ran a moment ago', async () => {
    vi.useFakeTimers({ now: new Date('2026-11-25T10:00:00.000Z') });
    const { first, seen, emitInSecond } = twoTabs();
    await first.signOut();
    vi.setSystemTime(new Date('2026-11-25T10:00:02.000Z'));
    emitInSecond('SIGNED_OUT', null);
    expect(seen).toEqual([false, false]);
  });

  it('is a lost session when the last "Sign out" in this browser was long ago', async () => {
    vi.useFakeTimers({ now: new Date('2026-11-25T10:00:00.000Z') });
    const { first, seen, emitInSecond } = twoTabs();
    await first.signOut();
    vi.setSystemTime(new Date('2026-11-25T10:05:00.000Z'));
    emitInSecond('SIGNED_OUT', null);
    expect(seen).toEqual([false, true]);
  });
});

describe('readProfile and writeProfile (spec R5b 5)', () => {
  it('reads the 3 synced columns of the person', async () => {
    supabase.query.maybeSingle.mockResolvedValueOnce({
      data: {
        machine: { name: 'Saved' },
        machine_changed_at: '2026-11-24T18:30:00+00:00',
        progress: { a: 1 },
        progress_reset_at: '2026-11-23T08:00:00+00:00',
      },
      error: null,
      status: 200,
    });
    const profile = await createSupabaseAccountClient(CONFIG).readProfile('id-a');
    expect(supabase.client.from).toHaveBeenCalledWith('profiles');
    expect(supabase.query.select).toHaveBeenCalledWith('machine, machine_changed_at, progress, progress_reset_at');
    expect(supabase.query.eq).toHaveBeenCalledWith('user_id', 'id-a');
    expect(profile).toEqual({
      machine: { name: 'Saved' },
      machineChangedAt: '2026-11-24T18:30:00+00:00',
      progress: { a: 1 },
      progressResetAt: '2026-11-23T08:00:00+00:00',
    });
  });

  it('gives null when the person has no row yet', async () => {
    expect(await createSupabaseAccountClient(CONFIG).readProfile('id-a')).toBeNull();
  });

  it('throws when the read fails', async () => {
    supabase.query.maybeSingle.mockResolvedValueOnce({ data: null, error: { code: '', message: 'TypeError: Failed to fetch' }, status: 0 });
    await expect(createSupabaseAccountClient(CONFIG).readProfile('id-a')).rejects.toThrow('Failed to fetch');
  });

  it('throws AccountSignedOutError when the login is not valid any more', async () => {
    supabase.query.maybeSingle.mockResolvedValueOnce({ data: null, error: { code: 'PGRST303', message: 'JWT expired' }, status: 401 });
    await expect(createSupabaseAccountClient(CONFIG).readProfile('id-a')).rejects.toBeInstanceOf(AccountSignedOutError);
  });

  it('upserts only the changed columns, with the user ID and the time of the write', async () => {
    vi.useFakeTimers({ now: new Date('2026-11-25T10:00:00.000Z') });
    const account = createSupabaseAccountClient(CONFIG);
    expect(await account.writeProfile('id-a', { machine: { name: 'Mine' }, machineChangedAt: '2026-11-25T09:59:00.000Z' })).toBe('ok');
    expect(await account.writeProfile('id-a', { progress: {}, progressResetAt: '2026-11-25T09:58:00.000Z' })).toBe('ok');
    vi.useRealTimers();
    expect(supabase.query.upsert.mock.calls).toEqual([
      [
        { user_id: 'id-a', updated_at: '2026-11-25T10:00:00.000Z', machine: { name: 'Mine' }, machine_changed_at: '2026-11-25T09:59:00.000Z' },
        { onConflict: 'user_id' },
      ],
      [
        { user_id: 'id-a', updated_at: '2026-11-25T10:00:00.000Z', progress: {}, progress_reset_at: '2026-11-25T09:58:00.000Z' },
        { onConflict: 'user_id' },
      ],
    ]);
  });

  it.each([
    ['a value over the size limit', 'too-big', { code: '23514', message: 'check' }, 400],
    ['an expired session', 'signed-out', { code: 'PGRST303', message: 'JWT expired' }, 401],
    ['a bad token', 'signed-out', { code: 'PGRST301', message: 'JWT invalid' }, 401],
    ['a request without a login', 'signed-out', { code: '42501', message: 'permission denied' }, 401],
    ['a server error', 'offline', { code: 'XX000', message: 'down' }, 500],
    ['no network', 'offline', { code: '', message: 'TypeError: Failed to fetch' }, 0],
  ] as const)('maps %s to "%s"', async (_name, result, error, status) => {
    supabase.query.upsert.mockResolvedValueOnce({ data: null, error, status });
    expect(await createSupabaseAccountClient(CONFIG).writeProfile('id-a', { progress: {} })).toBe(result);
  });

  it('says offline when the write throws', async () => {
    supabase.query.upsert.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    expect(await createSupabaseAccountClient(CONFIG).writeProfile('id-a', { progress: {} })).toBe('offline');
  });
});
