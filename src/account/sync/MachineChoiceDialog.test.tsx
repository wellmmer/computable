// @vitest-environment jsdom
import { act, cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { serializeMachine } from '@/engines/turing';
import { machine } from '@/engines/turing/test-helpers';
import { MACHINE_KEY } from '@/storage/keys';
import { renderWithIntl } from '@/test/intl';
import { MachineChoiceDialog } from './MachineChoiceDialog';

const files = vi.hoisted(() => ({ downloadMachine: vi.fn() }));
vi.mock('@/files/machine-file', () => ({ downloadMachine: files.downloadMachine }));

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
  vi.clearAllMocks();
  localStorage.clear();
});

afterEach(cleanup);

const MINE = machine([{ state: 'q0', read: '1', write: '0', move: 'R', next: 'qA' }], { name: 'Mine' });
// Noon in UTC is the same day in every time zone from UTC-11 to UTC+11.
const CONFLICT = {
  browser: { name: 'Mine', changedAt: '2026-11-25T12:00:00.000Z' },
  saved: { name: 'Saved one', changedAt: null },
};

function renderDialog() {
  const onKeepBrowser = vi.fn();
  const onUseSaved = vi.fn();
  renderWithIntl(<MachineChoiceDialog conflict={CONFLICT} onKeepBrowser={onKeepBrowser} onUseSaved={onUseSaved} />);
  return { dialog: screen.getByRole('dialog', { name: 'Which machine do you want to keep?' }), onKeepBrowser, onUseSaved };
}

describe('MachineChoiceDialog (spec R5b 5)', () => {
  it('shows both machines, with the time each changed when it is known', () => {
    const { dialog } = renderDialog();
    const browser = within(dialog).getByRole('group', { name: 'This browser' });
    expect(within(browser).getByText('Mine')).toBeTruthy();
    expect(within(browser).getByText(/^Changed Nov 25, 2026, \d{1,2}:\d{2}\s[AP]M$/)).toBeTruthy();
    const saved = within(dialog).getByRole('group', { name: 'Your account' });
    expect(within(saved).getByText('Saved one')).toBeTruthy();
    expect(within(saved).queryByText(/^Changed/)).toBeNull();
  });

  it('"Keep this browser\'s machine" closes the dialog and calls its handler', () => {
    const { dialog, onKeepBrowser, onUseSaved } = renderDialog();
    fireEvent.click(within(dialog).getByRole('button', { name: "Keep this browser's machine" }));
    expect(onKeepBrowser).toHaveBeenCalledOnce();
    expect(onUseSaved).not.toHaveBeenCalled();
  });

  it('"Use your saved machine" closes the dialog and calls its handler', () => {
    const { dialog, onKeepBrowser, onUseSaved } = renderDialog();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Use your saved machine' }));
    expect(onUseSaved).toHaveBeenCalledOnce();
    expect(onKeepBrowser).not.toHaveBeenCalled();
  });

  it('downloads the browser machine and stays open', () => {
    localStorage.setItem(MACHINE_KEY, serializeMachine(MINE));
    const { dialog, onKeepBrowser, onUseSaved } = renderDialog();
    fireEvent.click(within(dialog).getByRole('button', { name: "Download this browser's machine first" }));
    expect(files.downloadMachine).toHaveBeenCalledExactlyOnceWith(MINE);
    expect(dialog.hasAttribute('open')).toBe(true);
    expect(onKeepBrowser).not.toHaveBeenCalled();
    expect(onUseSaved).not.toHaveBeenCalled();
  });

  it('opens again when the browser closes it with no answer', () => {
    // Before any click on the page, Chrome may let Esc close a modal dialog without a "cancel" it can stop.
    const { dialog, onKeepBrowser, onUseSaved } = renderDialog();
    act(() => (dialog as HTMLDialogElement).close());
    expect((dialog as HTMLDialogElement).open).toBe(true);
    expect(onKeepBrowser).not.toHaveBeenCalled();
    expect(onUseSaved).not.toHaveBeenCalled();
  });

  it('stays open on Esc: the person must choose', () => {
    const { dialog, onKeepBrowser, onUseSaved } = renderDialog();
    const event = new Event('cancel', { cancelable: true });
    dialog.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(onKeepBrowser).not.toHaveBeenCalled();
    expect(onUseSaved).not.toHaveBeenCalled();
  });
});
