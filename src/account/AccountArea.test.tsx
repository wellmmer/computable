// @vitest-environment jsdom
import { act, cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { serializeMachine } from '@/engines/turing';
import { machine } from '@/engines/turing/test-helpers';
import { MACHINE_KEY } from '@/storage/keys';
import { sharedBrowserValues } from '@/storage/synced-key-value';
import { createFakeAccount } from '@/test/fake-account';
import { renderWithIntl } from '@/test/intl';
import type { AccountClient } from './account-client';
import { AccountArea } from './AccountArea';

const loader = vi.hoisted(() => ({ load: vi.fn(async (): Promise<AccountClient | null> => null) }));

vi.mock('./load-account', () => ({ loadAccountClient: loader.load }));

beforeAll(() => {
  // jsdom has <dialog> but not showModal() or close(). A browser fires "close" when the dialog closes.
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.open = false;
    this.dispatchEvent(new Event('close'));
  };
});

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const ADA = { id: 'id-ada', name: 'Ada Lovelace', email: 'ada@example.test' };
const rule = { state: 'q0', read: '1', write: '0', move: 'R', next: 'qA' } as const;
const MINE = machine([rule], { name: 'Mine' });
const SAVED = machine([rule], { name: 'Saved one' });

async function renderArea(fake: ReturnType<typeof createFakeAccount>) {
  loader.load.mockResolvedValueOnce(fake.client);
  await act(async () => {
    renderWithIntl(<AccountArea />);
  });
}

describe('AccountArea (spec R5b 2)', () => {
  it('shows nothing when the 2 Supabase values are not set', async () => {
    loader.load.mockResolvedValueOnce(null);
    await act(async () => {
      renderWithIntl(<AccountArea />);
    });
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('shows "Sign in" when an account client exists, and reads no row', async () => {
    const fake = createFakeAccount();
    await renderArea(fake);
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeTruthy();
    expect(fake.calls.readProfile).toBe(0);
  });
});

describe('AccountArea, the sync (spec R5b 5)', () => {
  it('starts the sync for the signed-in person, and the menu says the work is saved', async () => {
    const fake = createFakeAccount({ user: ADA });
    await renderArea(fake);
    expect(fake.calls.readProfile).toBe(1);
    fireEvent.click(screen.getByRole('button', { name: 'Account: Ada Lovelace' }));
    expect(screen.getByRole('status').textContent).toBe('Saved to your account');
  });

  it('does not start again when Supabase renews the token of the same person', async () => {
    const fake = createFakeAccount({ user: ADA });
    await renderArea(fake);
    await act(async () => fake.setUser({ ...ADA }));
    expect(fake.calls.readProfile).toBe(1);
  });

  it('says so when a write fails for lack of a connection', async () => {
    localStorage.setItem(MACHINE_KEY, serializeMachine(MINE));
    const fake = createFakeAccount({ user: ADA, writeResult: 'offline' });
    await renderArea(fake);
    fireEvent.click(screen.getByRole('button', { name: 'Account: Ada Lovelace' }));
    expect(screen.getByRole('status').textContent).toBe('Not saved: no connection. Your work is safe in this browser.');
  });

  it('asks which machine to keep when both changed, and "Use your saved machine" loads it', async () => {
    localStorage.setItem(MACHINE_KEY, serializeMachine(MINE));
    const fake = createFakeAccount({ user: ADA, profile: { machine: JSON.parse(serializeMachine(SAVED)), machineChangedAt: null, progress: {}, progressResetAt: null } });
    await renderArea(fake);
    const dialog = screen.getByRole('dialog', { name: 'Which machine do you want to keep?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Use your saved machine' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(localStorage.getItem(MACHINE_KEY)).toBe(serializeMachine(SAVED));
    expect(fake.calls.writeProfile).toEqual([]);
  });

  it('"Keep this browser\'s machine" uploads it', async () => {
    localStorage.setItem(MACHINE_KEY, serializeMachine(MINE));
    const fake = createFakeAccount({ user: ADA, profile: { machine: JSON.parse(serializeMachine(SAVED)), machineChangedAt: null, progress: {}, progressResetAt: null } });
    await renderArea(fake);
    const dialog = screen.getByRole('dialog', { name: 'Which machine do you want to keep?' });
    await act(async () => fireEvent.click(within(dialog).getByRole('button', { name: "Keep this browser's machine" })));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(fake.calls.writeProfile).toEqual([{ machine: JSON.parse(serializeMachine(MINE)), machineChangedAt: null }]);
  });

  it('closes the question when the person signs out', async () => {
    localStorage.setItem(MACHINE_KEY, serializeMachine(MINE));
    const fake = createFakeAccount({ user: ADA, profile: { machine: JSON.parse(serializeMachine(SAVED)), machineChangedAt: null, progress: {}, progressResetAt: null } });
    await renderArea(fake);
    expect(screen.getByRole('dialog', { name: 'Which machine do you want to keep?' })).toBeTruthy();
    await act(async () => fake.setUser(null));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('stops the sync after a sign-out: a later change is not sent', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const fake = createFakeAccount({ user: ADA });
    await renderArea(fake);
    await act(async () => fake.setUser(null));
    sharedBrowserValues().write(MACHINE_KEY, serializeMachine(MINE));
    await act(async () => vi.advanceTimersByTimeAsync(3000));
    expect(fake.calls.writeProfile).toEqual([]);
  });

  it('sends a change while signed in', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const fake = createFakeAccount({ user: ADA });
    await renderArea(fake);
    sharedBrowserValues().write(MACHINE_KEY, serializeMachine(MINE));
    await act(async () => vi.advanceTimersByTimeAsync(2000));
    expect(fake.calls.writeProfile).toHaveLength(1);
  });
});
