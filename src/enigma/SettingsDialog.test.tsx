// @vitest-environment jsdom
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { renderWithIntl } from '@/test/intl';
import { LAB_SETTINGS } from './lab-state';
import { SettingsDialog } from './SettingsDialog';

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

function openDialog() {
  const onSave = vi.fn();
  const onClose = vi.fn();
  renderWithIntl(<SettingsDialog settings={LAB_SETTINGS} onSave={onSave} onClose={onClose} />);
  return { onSave, onClose, dialog: screen.getByRole('dialog', { name: 'Change settings' }) };
}

const plug = (dialog: HTMLElement, name: string | RegExp) => within(within(dialog).getByRole('group', { name: 'Plug pairs' })).getByRole('button', { name });

describe('SettingsDialog (spec R3 3, "Change settings")', () => {
  it('shows the rotors, rings, reflector and plug pairs of the lab', () => {
    const { dialog } = openDialog();
    const value = (name: string) => within(dialog).getByRole<HTMLSelectElement>('combobox', { name }).value;
    expect(['Left rotor', 'Middle rotor', 'Right rotor'].map(value)).toEqual(['I', 'II', 'III']);
    expect(['Left ring', 'Middle ring', 'Right ring'].map(value)).toEqual(['A', 'A', 'A']);
    expect(within(dialog).getByRole<HTMLInputElement>('radio', { name: 'B' }).checked).toBe(true);
    expect(within(dialog).getByText('AV BS CG DL FU HZ IN KM OW RX')).toBeTruthy();
    expect(plug(dialog, 'A, joined to V')).toBeTruthy();
    expect(plug(dialog, 'E')).toBeTruthy();
  });

  it('adds a plug pair from 2 taps, and removes a pair with one tap on a joined letter', () => {
    const { dialog, onSave } = openDialog();
    fireEvent.click(plug(dialog, 'E'));
    expect(plug(dialog, 'E').getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(plug(dialog, 'J'));
    expect(plug(dialog, 'E, joined to J')).toBeTruthy();
    fireEvent.click(plug(dialog, 'Z, joined to H'));
    expect(within(dialog).getByText('AV BS CG DL FU IN KM OW RX EJ')).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledWith({ ...LAB_SETTINGS, plugs: ['AV', 'BS', 'CG', 'DL', 'FU', 'IN', 'KM', 'OW', 'RX', 'EJ'] });
  });

  it('takes back a first tap when the same letter is tapped again', () => {
    const { dialog } = openDialog();
    fireEvent.click(plug(dialog, 'E'));
    fireEvent.click(plug(dialog, 'E'));
    expect(plug(dialog, 'E').getAttribute('aria-pressed')).toBe('false');
  });

  it('shows an error next to the rotors when one rotor is there twice, and does not save', () => {
    const { dialog, onSave } = openDialog();
    fireEvent.change(within(dialog).getByRole('combobox', { name: 'Right rotor' }), { target: { value: 'I' } });
    const rotors = within(dialog).getByRole('group', { name: 'Rotors' });
    expect(within(rotors).getByText('Rotor I is there twice. Use each rotor only once.')).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(onSave).not.toHaveBeenCalled();
  });

  it('reads the error aloud when it shows, and moves focus to it on Save', () => {
    const { dialog } = openDialog();
    fireEvent.change(within(dialog).getByRole('combobox', { name: 'Right rotor' }), { target: { value: 'I' } });
    const alert = within(dialog).getByRole('alert');
    expect(alert.textContent).toBe('Rotor I is there twice. Use each rotor only once.');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(document.activeElement).toBe(alert);
  });

  it('saves new rotors, rings and reflector', () => {
    const { dialog, onSave } = openDialog();
    fireEvent.change(within(dialog).getByRole('combobox', { name: 'Left rotor' }), { target: { value: 'VIII' } });
    fireEvent.change(within(dialog).getByRole('combobox', { name: 'Middle ring' }), { target: { value: 'Q' } });
    fireEvent.click(within(dialog).getByRole('radio', { name: 'C' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledWith({ ...LAB_SETTINGS, rotors: ['VIII', 'II', 'III'], rings: ['A', 'Q', 'A'], reflector: 'C' });
  });

  it('closes without saving on Cancel', () => {
    const { dialog, onSave, onClose } = openDialog();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
  });
});
