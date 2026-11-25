// @vitest-environment jsdom
import { act, cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createFakeAccount } from '@/test/fake-account';
import { renderWithIntl } from '@/test/intl';
import { AccountMenu } from './AccountMenu';

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

afterEach(cleanup);

const ADA = { id: 'id-ada', name: 'Ada Lovelace', email: 'ada@example.test' };

/** Renders the menu and waits for the effects that ask the fake client about a failed return. */
async function renderMenu(fake: ReturnType<typeof createFakeAccount>) {
  await act(async () => {
    renderWithIntl(<AccountMenu client={fake.client} />);
  });
}

describe('AccountMenu, signed out (spec R5b 4)', () => {
  it('shows "Sign in", which opens the dialog with both services and the note', async () => {
    await renderMenu(createFakeAccount());
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    const dialog = screen.getByRole('dialog', { name: 'Sign in' });
    expect(within(dialog).getByText('Sign in to keep your machine and quiz scores on all your devices.')).toBeTruthy();
    expect(within(dialog).getByRole('button', { name: 'Continue with Google' })).toBeTruthy();
    expect(within(dialog).getByRole('button', { name: 'Continue with GitHub' })).toBeTruthy();
    expect(within(dialog).getByText('Optional. Everything works without an account.')).toBeTruthy();
  });

  it('opens the sign-in page of the chosen service', async () => {
    const fake = createFakeAccount();
    await renderMenu(fake);
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Continue with GitHub' })));
    expect(fake.calls.signInWith).toEqual(['github']);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('says the sign-in did not finish when the sign-in page cannot open', async () => {
    const fake = createFakeAccount({ signInResult: false });
    await renderMenu(fake);
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Continue with Google' })));
    expect(fake.calls.signInWith).toEqual(['google']);
    expect(screen.getByRole('alert').textContent).toBe('Sign-in did not finish. Try again, or keep working without an account.');
  });

  it('opens the dialog with the message when the browser comes back from a cancelled sign-in (spec R5b 6)', async () => {
    await renderMenu(createFakeAccount({ failedOnReturn: true }));
    const dialog = await screen.findByRole('dialog', { name: 'Sign in' });
    expect(within(dialog).getByRole('alert').textContent).toBe('Sign-in did not finish. Try again, or keep working without an account.');
  });

  it('closes the dialog with Close', async () => {
    await renderMenu(createFakeAccount());
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('AccountMenu, signed in (spec R5b 4)', () => {
  it('shows the name of the person', async () => {
    await renderMenu(createFakeAccount({ user: ADA }));
    const button = screen.getByRole('button', { name: 'Account: Ada Lovelace' });
    expect(button.textContent).toBe('Ada Lovelace');
    expect(screen.queryByRole('button', { name: 'Sign in' })).toBeNull();
  });

  it('shows the email when the service gave no name', async () => {
    await renderMenu(createFakeAccount({ user: { id: 'id-ada', name: null, email: 'ada@example.test' } }));
    expect(screen.getByRole('button', { name: 'Account: ada@example.test' }).textContent).toBe('ada@example.test');
  });

  it('opens a list with "Sign out" and "Delete my account"', async () => {
    await renderMenu(createFakeAccount({ user: ADA }));
    const button = screen.getByRole('button', { name: 'Account: Ada Lovelace' });
    expect(button.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(button);
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Delete my account' })).toBeTruthy();
  });

  it('closes the list with Esc and gives the focus back to the button', async () => {
    await renderMenu(createFakeAccount({ user: ADA }));
    const button = screen.getByRole('button', { name: 'Account: Ada Lovelace' });
    fireEvent.click(button);
    fireEvent.keyDown(screen.getByRole('button', { name: 'Sign out' }), { key: 'Escape' });
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(button);
  });

  it('signs out, then shows "Sign in" with the focus on it', async () => {
    const fake = createFakeAccount({ user: ADA });
    await renderMenu(fake);
    fireEvent.click(screen.getByRole('button', { name: 'Account: Ada Lovelace' }));
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Sign out' })));
    expect(fake.calls.signOut).toBe(1);
    const signIn = screen.getByRole('button', { name: 'Sign in' });
    expect(document.activeElement).toBe(signIn);
  });

  it('asks before it deletes the account, and Cancel deletes nothing', async () => {
    const fake = createFakeAccount({ user: ADA });
    await renderMenu(fake);
    fireEvent.click(screen.getByRole('button', { name: 'Account: Ada Lovelace' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete my account' }));
    const dialog = screen.getByRole('dialog', { name: 'Delete my account' });
    expect(within(dialog).getByText('This deletes your account and the copy saved in it. This browser keeps its own copy.')).toBeTruthy();
    const cancel = within(dialog).getByRole('button', { name: 'Cancel' });
    expect(document.activeElement).toBe(cancel);
    fireEvent.click(cancel);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(fake.calls.deleteAccount).toBe(0);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Account: Ada Lovelace' }));
  });

  it('deletes the account after the second "Delete my account", then shows "Sign in"', async () => {
    const fake = createFakeAccount({ user: ADA });
    await renderMenu(fake);
    fireEvent.click(screen.getByRole('button', { name: 'Account: Ada Lovelace' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete my account' }));
    const dialog = screen.getByRole('dialog', { name: 'Delete my account' });
    await act(async () => fireEvent.click(within(dialog).getByRole('button', { name: 'Delete my account' })));
    expect(fake.calls.deleteAccount).toBe(1);
    expect(screen.queryByRole('dialog')).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Sign in' })));
  });

  it('says the account was not deleted when the deletion fails, and keeps the dialog open (spec R5b 6)', async () => {
    const fake = createFakeAccount({ user: ADA, deleteResult: false });
    await renderMenu(fake);
    fireEvent.click(screen.getByRole('button', { name: 'Account: Ada Lovelace' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete my account' }));
    const dialog = screen.getByRole('dialog', { name: 'Delete my account' });
    await act(async () => fireEvent.click(within(dialog).getByRole('button', { name: 'Delete my account' })));
    expect(within(dialog).getByRole('alert').textContent).toBe('Your account was not deleted. Try again.');
    expect(screen.getByRole('button', { name: 'Account: Ada Lovelace' })).toBeTruthy();
  });
});
