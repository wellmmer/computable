// @vitest-environment jsdom
import { act, cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { renderWithIntl } from '@/test/intl';
import { EnigmaLab } from './EnigmaLab';

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

/** Types on the physical keyboard: one keydown per character, sent to the page. */
function typeKeys(text: string, init: KeyboardEventInit = {}) {
  for (const key of text) act(() => fireEvent.keyDown(document.body, { key, ...init }));
}

const strip = (name: string) => screen.getByRole('region', { name }).querySelector('[data-strip]')?.textContent;

describe('EnigmaLab (spec R3 3)', () => {
  it('shows the default settings in one line', () => {
    renderWithIntl(<EnigmaLab />);
    const settings = screen.getByRole('region', { name: 'Settings' });
    const facts = within(settings)
      .getAllByRole('term')
      .map((term) => `${term.textContent}: ${term.nextElementSibling?.textContent}`);
    expect(facts).toEqual(['Rotors: I II III', 'Rings: A A A', 'Plug pairs: AV BS CG DL FU HZ IN KM OW RX', 'Reflector: B']);
    expect(within(settings).getByText('I II III, B, 10 plug pairs')).toBeTruthy();
  });

  it('types WETTERBERICHT from the physical keyboard, in groups of 5, and reads the last lamp aloud', () => {
    renderWithIntl(<EnigmaLab />);
    typeKeys('wetterbericht');
    expect(strip('You typed')).toBe('WETTE RBERI CHT');
    expect(strip('Lamps lit')).toBe('PBJGO LIZQM QGZ');
    expect(screen.getByRole('status').textContent).toBe('Lamp Z');
    expect(screen.getByText('Right rotor, rotor III, shows N')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Where the current went for T' })).toBeTruthy();
  });

  it('types from the on-screen keys too', () => {
    renderWithIntl(<EnigmaLab />);
    const keyboard = screen.getByRole('group', { name: 'Keyboard' });
    fireEvent.click(within(keyboard).getByRole('button', { name: 'W' }));
    fireEvent.click(within(keyboard).getByRole('button', { name: 'E' }));
    expect(strip('Lamps lit')).toBe('PB');
  });

  it('removes the last letter on Backspace and turns the rotors back', () => {
    renderWithIntl(<EnigmaLab />);
    typeKeys('WET');
    act(() => fireEvent.keyDown(document.body, { key: 'Backspace' }));
    expect(strip('You typed')).toBe('WE');
    expect(screen.getByText('Right rotor, rotor III, shows C')).toBeTruthy();
    expect(screen.getByRole('status').textContent).toBe('Removed T');
  });

  it('ignores keys with Ctrl, Alt or Cmd, and keys that are not letters', () => {
    renderWithIntl(<EnigmaLab />);
    typeKeys('c', { ctrlKey: true });
    typeKeys('v', { metaKey: true });
    typeKeys('1 ä');
    expect(strip('You typed')).toBe('');
  });

  it('decrypts: back to start, then type the lit letters', () => {
    renderWithIntl(<EnigmaLab />);
    typeKeys('WETTERBERICHT');
    fireEvent.click(screen.getByRole('button', { name: 'Back to start (B L A)' }));
    expect(strip('Lamps lit')).toBe('');
    expect(screen.getByText('Lamps lit before you went back: PBJGO LIZQM QGZ')).toBeTruthy();
    typeKeys('PBJGOLIZQMQGZ');
    expect(strip('Lamps lit')).toBe('WETTE RBERI CHT');
  });

  it('reads the new window letter aloud after ▲ or ▼', () => {
    renderWithIntl(<EnigmaLab />);
    fireEvent.click(screen.getByRole('button', { name: 'Middle rotor: next letter' }));
    expect(screen.getByRole('status').textContent).toBe('Middle rotor, rotor II, shows M');
    fireEvent.click(screen.getByRole('button', { name: 'Right rotor: previous letter' }));
    expect(screen.getByRole('status').textContent).toBe('Right rotor, rotor III, shows Z');
  });

  it('starts a new message when a rotor turns with letters in the strips', () => {
    renderWithIntl(<EnigmaLab />);
    typeKeys('WE');
    fireEvent.click(screen.getByRole('button', { name: 'Middle rotor: next letter' }));
    expect(strip('You typed')).toBe('');
    expect(screen.getByText('Lamps lit before you turned a rotor: PB')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Back to start (B M C)' })).toBeTruthy();
  });

  it('clears the strips and keeps the rotors where they are', () => {
    renderWithIntl(<EnigmaLab />);
    typeKeys('WE');
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(strip('You typed')).toBe('');
    expect(screen.getByRole('button', { name: 'Back to start (B L C)' })).toBeTruthy();
  });

  it('copies the lit letters, in groups of 5', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    renderWithIntl(<EnigmaLab />);
    typeKeys('WETTERBERICHT');
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Copy lit letters' })));
    expect(writeText).toHaveBeenCalledWith('PBJGO LIZQM QGZ');
    expect(screen.getByRole('button', { name: 'Copied' })).toBeTruthy();
  });

  it('changes the settings in the dialog, which clears the strips, and the keys do not type while it is open', () => {
    renderWithIntl(<EnigmaLab />);
    typeKeys('WE');
    fireEvent.click(screen.getAllByRole('button', { name: /^Change/ })[0]);
    const dialog = screen.getByRole('dialog', { name: 'Change settings' });
    typeKeys('X');
    expect(strip('You typed')).toBe('WE');
    fireEvent.change(within(dialog).getByRole('combobox', { name: 'Left rotor' }), { target: { value: 'V' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(strip('You typed')).toBe('');
    expect(within(screen.getByRole('region', { name: 'Settings' })).getByText('V II III')).toBeTruthy();
  });
});
