import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const adapter = vi.hoisted(() => ({ create: vi.fn((config: { url: string; anonKey: string }) => ({ config })) }));

vi.mock('./supabase-account', () => ({ createSupabaseAccountClient: adapter.create }));

beforeEach(() => {
  // loadAccountClient keeps one client per page, so each test needs a fresh module.
  vi.resetModules();
  adapter.create.mockClear();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('loadAccountClient', () => {
  it('returns null and loads no Supabase code when the 2 values are not set', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '');
    const { loadAccountClient } = await import('./load-account');
    expect(await loadAccountClient()).toBeNull();
    expect(adapter.create).not.toHaveBeenCalled();
  });

  it('creates one client for the page, with the 2 values', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'public-key');
    const { loadAccountClient } = await import('./load-account');
    const first = await loadAccountClient();
    expect(first).not.toBeNull();
    expect(await loadAccountClient()).toBe(first);
    expect(adapter.create).toHaveBeenCalledOnce();
    expect(adapter.create).toHaveBeenCalledWith({ url: 'https://example.supabase.co', anonKey: 'public-key' });
  });
});
