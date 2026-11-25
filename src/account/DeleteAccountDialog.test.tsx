// @vitest-environment jsdom
import { act, cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { renderWithIntl } from '@/test/intl';
import { DeleteAccountDialog } from './DeleteAccountDialog';

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

/** Esc on an open modal dialog: the browser fires "cancel", and closes the dialog unless a listener prevents it. */
function pressEscape(dialog: HTMLElement) {
  const event = new Event('cancel', { cancelable: true });
  dialog.dispatchEvent(event);
  return event.defaultPrevented;
}

/** A deletion that waits until the test says how it ends. */
function pendingDeletion() {
  let finish: (deleted: boolean) => void = () => {};
  const onDelete = vi.fn(
    () =>
      new Promise<boolean>((resolve) => {
        finish = resolve;
      }),
  );
  return { onDelete, finish: (deleted: boolean) => finish(deleted) };
}

describe('DeleteAccountDialog while the deletion runs (spec R5b 6)', () => {
  it('keeps the dialog open on Esc and turns Cancel off, so the result is always seen', async () => {
    const deletion = pendingDeletion();
    const onClose = vi.fn();
    renderWithIntl(<DeleteAccountDialog onDelete={deletion.onDelete} onClose={onClose} />);
    const dialog = screen.getByRole('dialog', { name: 'Delete my account' });
    const cancel = within(dialog).getByRole<HTMLButtonElement>('button', { name: 'Cancel' });

    await act(async () => fireEvent.click(within(dialog).getByRole('button', { name: 'Delete my account' })));
    expect(deletion.onDelete).toHaveBeenCalledOnce();
    expect(pressEscape(dialog)).toBe(true);
    expect(cancel.disabled).toBe(true);
    fireEvent.click(cancel);
    expect(onClose).not.toHaveBeenCalled();

    await act(async () => deletion.finish(false));
    expect(within(dialog).getByRole('alert').textContent).toBe('Your account was not deleted. Try again.');
    expect(cancel.disabled).toBe(false);
    expect(pressEscape(dialog)).toBe(false);
  });

  it('lets Esc close the dialog before the deletion starts', () => {
    renderWithIntl(<DeleteAccountDialog onDelete={pendingDeletion().onDelete} onClose={vi.fn()} />);
    expect(pressEscape(screen.getByRole('dialog', { name: 'Delete my account' }))).toBe(false);
  });
});
