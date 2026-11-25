// @vitest-environment jsdom
import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithIntl } from '@/test/intl';
import SupportPage from './page';

// The payment part has its own tests in src/support. This file checks the page text.
vi.mock('@/support/SupportView', () => ({ SupportView: () => null }));

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe('Support (spec 7)', () => {
  it('says the site has no accounts when the 2 Supabase values are not set (spec R5b 2)', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '');
    renderWithIntl(<SupportPage />);
    expect(
      screen.getByText('Computable is free, with no ads and no accounts. If it helped you learn, a coffee helps me keep building it.'),
    ).toBeTruthy();
  });

  it('says accounts are optional when the 2 Supabase values are set (spec R5b 5)', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'public-key');
    renderWithIntl(<SupportPage />);
    expect(
      screen.getByText('Computable is free, with no ads. Accounts are optional. If it helped you learn, a coffee helps me keep building it.'),
    ).toBeTruthy();
  });
});
