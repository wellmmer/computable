import { afterEach, describe, expect, it, vi } from 'vitest';
import { accountConfig, toAccountConfig } from './config';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('toAccountConfig (spec R5b 2: without the 2 values, the site hides "Sign in")', () => {
  it('returns null when a value is missing', () => {
    expect(toAccountConfig(undefined, 'key')).toBeNull();
    expect(toAccountConfig('https://example.supabase.co', undefined)).toBeNull();
    expect(toAccountConfig(undefined, undefined)).toBeNull();
  });

  it('returns null when a value is empty or only spaces', () => {
    expect(toAccountConfig('', 'key')).toBeNull();
    expect(toAccountConfig('https://example.supabase.co', '  ')).toBeNull();
  });

  it('returns both values, without spaces around them', () => {
    expect(toAccountConfig(' https://example.supabase.co ', ' key ')).toEqual({ url: 'https://example.supabase.co', anonKey: 'key' });
  });
});

describe('accountConfig', () => {
  it('reads NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'key');
    expect(accountConfig()).toEqual({ url: 'https://example.supabase.co', anonKey: 'key' });
  });

  it('returns null when the 2 values are not set', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '');
    expect(accountConfig()).toBeNull();
  });
});
