// @vitest-environment jsdom
import { act, cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createFakeAccount } from '@/test/fake-account';
import { renderWithIntl } from '@/test/intl';
import type { AccountClient } from './account-client';
import { AccountArea } from './AccountArea';

const loader = vi.hoisted(() => ({ load: vi.fn(async (): Promise<AccountClient | null> => null) }));

vi.mock('./load-account', () => ({ loadAccountClient: loader.load }));

afterEach(cleanup);

describe('AccountArea (spec R5b 2)', () => {
  it('shows nothing when the 2 Supabase values are not set', async () => {
    loader.load.mockResolvedValueOnce(null);
    await act(async () => {
      renderWithIntl(<AccountArea />);
    });
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('shows "Sign in" when an account client exists', async () => {
    loader.load.mockResolvedValueOnce(createFakeAccount().client);
    await act(async () => {
      renderWithIntl(<AccountArea />);
    });
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeTruthy();
  });
});
