// @vitest-environment jsdom
import { act, cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { renderWithIntl } from '@/test/intl';
import { PRACTICE } from '@/bombe/practice-message';
import { encrypt } from '@/engines/enigma';
import { MY_SECRET_HASH } from '@/home/secret-link';
import { SECRET_KEY, type SavedSecret } from '@/home/secret-storage';
import { EnigmaLab } from './EnigmaLab';
import { groupsOf5 } from './lab-state';
import { tryHash, type KeyToTry } from './try-link';

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

  it('marks its settings line while it listens to the physical keyboard, so tests know when to type', () => {
    renderWithIntl(<EnigmaLab />);
    const settings = screen.getByRole('region', { name: 'Settings' });
    expect(settings.getAttribute('data-keys')).toBe('on');
    fireEvent.click(screen.getAllByRole('button', { name: /^Change/ })[0]);
    expect(settings.getAttribute('data-keys')).toBeNull();
  });

  it('shows a blinking caret after the typed letters while the keyboard types, and hides it while the settings dialog is open', () => {
    renderWithIntl(<EnigmaLab />);
    const typed = () => screen.getByRole('region', { name: 'You typed' }).querySelector('[data-strip]');
    const caret = () => typed()?.querySelector('[data-caret]') ?? null;
    expect(caret()?.getAttribute('aria-hidden')).toBe('true');
    typeKeys('WET');
    expect(typed()?.lastElementChild).toBe(caret());
    expect(strip('You typed')).toBe('WET');
    fireEvent.click(screen.getAllByRole('button', { name: /^Change/ })[0]);
    expect(caret()).toBeNull();
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

describe('a message loaded into the lab (spec R3 4)', () => {
  const box = () => screen.getByRole('region', { name: /^Decrypting/ });

  it('sets the key sheet, shows the secret letters above the machine, and moves the focus there', () => {
    renderWithIntl(<EnigmaLab />);
    typeKeys('WE');
    fireEvent.click(screen.getByRole('button', { name: 'Load into the machine: Practice 1: no plug pairs' }));
    expect(screen.getByRole('heading', { name: 'Decrypting: Practice 1: no plug pairs' })).toBe(document.activeElement);
    expect(within(box()).getByText('ILBDA SDTMV HFEBU AWAOM QEQGT')).toBeTruthy();
    expect(within(screen.getByRole('region', { name: 'Settings' })).getByText('No plug pairs')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Back to start (A A A)' })).toBeTruthy();
    expect(strip('You typed')).toBe('');
  });

  it('checks the answer: so far, wrong, then right', () => {
    renderWithIntl(<EnigmaLab />);
    fireEvent.click(screen.getByRole('button', { name: 'Load into the machine: Practice 1: no plug pairs' }));
    const check = () => fireEvent.click(within(box()).getByRole('button', { name: 'Check my answer' }));
    check();
    expect(within(box()).getByText('Type the secret letters first.')).toBeTruthy();
    typeKeys('ILBDA');
    check();
    expect(within(box()).getByText('So far, so good: 5 of 25 letters are right. Keep typing.')).toBeTruthy();
    typeKeys('Q');
    expect(within(box()).queryByText(/So far/)).toBeNull();
    check();
    expect(within(box()).getByText('Letter 6 is not right. Backspace takes letters back.')).toBeTruthy();
    act(() => fireEvent.keyDown(document.body, { key: 'Backspace' }));
    typeKeys('SDTMVHFEBUAWAOMQEQGT');
    check();
    expect(within(box()).getByText('Right! The message says: HELLO FROM BLETCHLEY PARK')).toBeTruthy();
    expect(strip('Lamps lit')).toBe('HELLO XFROM XBLET CHLEY XPARK');
  });

  it('types the whole message on "Type it for me", from the start', () => {
    renderWithIntl(<EnigmaLab />);
    fireEvent.click(screen.getByRole('button', { name: 'Load into the machine: The Scharnhorst’s last message, 1943' }));
    typeKeys('ABC');
    fireEvent.click(within(box()).getByRole('button', { name: 'Type it for me' }));
    expect(strip('Lamps lit')).toBe('STEUE REJTA NAFJO RDJAN STAND ORTQU AAACC CVIER NEUNN EUNZW OFAHR TZWON ULSMX XSCHA RNHOR STHCO');
    fireEvent.click(within(box()).getByRole('button', { name: 'Check my answer' }));
    expect(within(box()).getByText(/^Right! The message says: STEUEREJTANAFJORD/)).toBeTruthy();
  });

  it('closes the box and keeps the machine as it is', () => {
    renderWithIntl(<EnigmaLab />);
    fireEvent.click(screen.getByRole('button', { name: 'Load part 1: Operation Barbarossa, 1941' }));
    expect(screen.getByRole('button', { name: 'Back to start (B L A)' })).toBeTruthy();
    fireEvent.click(within(box()).getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('region', { name: /^Decrypting/ })).toBeNull();
    expect(within(screen.getByRole('region', { name: 'Settings' })).getByText('II IV V')).toBeTruthy();
  });

  it('gives the focus back to the button that loaded the message when the box closes', () => {
    renderWithIntl(<EnigmaLab />);
    const load = screen.getByRole('button', { name: 'Load part 2: Operation Barbarossa, 1941' });
    fireEvent.click(load);
    fireEvent.click(within(box()).getByRole('button', { name: 'Close' }));
    expect(document.activeElement).toBe(load);
  });
});

describe('a Bombe stop opened from its link (spec R4 3, "Try in the Enigma lab")', () => {
  const box = () => screen.getByRole('region', { name: /^Decrypting/ });
  const STOP: KeyToTry = {
    settings: { ...PRACTICE.settings, plugs: ['AH', 'BP', 'EX', 'KW', 'MR', 'NT', 'VZ'] },
    start: PRACTICE.start,
    cipher: PRACTICE.cipher,
  };

  afterEach(() => window.history.replaceState(null, '', '/'));

  it('loads the key, shows the secret letters without "Check my answer", and drops the link from the address', () => {
    window.history.replaceState(null, '', `/en/enigma${tryHash(STOP)}`);
    renderWithIntl(<EnigmaLab />);
    expect(screen.getByRole('heading', { name: 'Decrypting: Bombe stop, rotors II III V, start Q K A' })).toBe(document.activeElement);
    expect(within(box()).getByText('The Bombe found only some plug pairs. Letters it did not reach may come out wrong.')).toBeTruthy();
    expect(within(box()).queryByRole('button', { name: 'Check my answer' })).toBeNull();
    expect(within(screen.getByRole('region', { name: 'Settings' })).getByText('AH BP EX KW MR NT VZ')).toBeTruthy();
    expect(window.location.hash).toBe('');
    fireEvent.click(within(box()).getByRole('button', { name: 'Type it for me' }));
    expect(strip('Lamps lit')?.startsWith('WETTE RBERI CHT')).toBe(true);
  });

  it('opens a link pasted into the address bar of the open lab', () => {
    renderWithIntl(<EnigmaLab />);
    expect(screen.queryByRole('region', { name: /^Decrypting/ })).toBeNull();
    act(() => {
      window.history.replaceState(null, '', `/en/enigma${tryHash(STOP)}`);
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    expect(screen.getByRole('heading', { name: 'Decrypting: Bombe stop, rotors II III V, start Q K A' })).toBeTruthy();
  });
});

describe('Home’s secret opened from "Load my secret into the lab" (spec R4 4)', () => {
  const box = () => screen.getByRole('region', { name: /^Decrypting/ });
  const SECRET: SavedSecret = { plain: 'Hello, Turing!', cipher: encrypt(PRACTICE.settings, PRACTICE.start, 'HELLOXTURING'), settings: PRACTICE.settings, start: PRACTICE.start };

  afterEach(() => {
    window.history.replaceState(null, '', '/');
    localStorage.clear();
  });

  it('loads the saved key, shows the secret letters, and checks the answer', () => {
    localStorage.setItem(SECRET_KEY, JSON.stringify(SECRET));
    window.history.replaceState(null, '', `/en/enigma${MY_SECRET_HASH}`);
    renderWithIntl(<EnigmaLab />);
    expect(screen.getByRole('heading', { name: 'Decrypting: Your secret from Home' })).toBe(document.activeElement);
    expect(within(box()).getByText(groupsOf5(SECRET.cipher))).toBeTruthy();
    expect(within(screen.getByRole('region', { name: 'Settings' })).getByText('II III V')).toBeTruthy();
    expect(window.location.hash).toBe('');
    fireEvent.click(within(box()).getByRole('button', { name: 'Type it for me' }));
    expect(strip('Lamps lit')).toBe('HELLO XTURI NG');
    fireEvent.click(within(box()).getByRole('button', { name: 'Check my answer' }));
    expect(within(box()).getByText('Right! The message says: HELLO TURING')).toBeTruthy();
  });

  it('opens nothing when this browser has no secret, or a secret with a key the lab does not allow', () => {
    window.history.replaceState(null, '', `/en/enigma${MY_SECRET_HASH}`);
    renderWithIntl(<EnigmaLab />);
    expect(screen.queryByRole('region', { name: /^Decrypting/ })).toBeNull();
    cleanup();
    localStorage.setItem(SECRET_KEY, JSON.stringify({ ...SECRET, settings: { ...SECRET.settings, rotors: ['I', 'I', 'V'] } }));
    window.history.replaceState(null, '', `/en/enigma${MY_SECRET_HASH}`);
    renderWithIntl(<EnigmaLab />);
    expect(screen.queryByRole('region', { name: /^Decrypting/ })).toBeNull();
  });
});

describe('EnigmaLab, the machine choice (spec R5a 3)', () => {
  const machine = () => screen.getByRole('group', { name: 'Machine' });
  const facts = () =>
    within(screen.getByRole('region', { name: 'Settings' }))
      .getAllByRole('term')
      .map((term) => `${term.textContent}: ${term.nextElementSibling?.textContent}`);

  it('offers the Enigma I and the naval M4, with the Enigma I chosen', () => {
    renderWithIntl(<EnigmaLab />);
    const radios = within(machine()).getAllByRole<HTMLInputElement>('radio');
    expect(radios.map((radio) => [radio.labels?.[0]?.textContent, radio.checked])).toEqual([
      ['Enigma I', true],
      ['Naval M4', false],
    ]);
    expect(within(machine()).getByText('Switching the machine puts back its starting key: rotors, rings, plug pairs and start. It also clears the letters you typed and closes a loaded message.')).toBeTruthy();
    expect(screen.queryByText(/^Thin rotor/)).toBeNull();
  });

  it('switches to the M4: 4 rotor windows, the M4 settings, and empty strips', () => {
    renderWithIntl(<EnigmaLab />);
    typeKeys('WET');
    fireEvent.click(within(machine()).getByRole('radio', { name: 'Naval M4' }));
    expect(strip('You typed')).toBe('');
    expect(facts()).toEqual(['Rotors: Beta I II III', 'Rings: A A A A', 'Plug pairs: AV BS CG DL FU HZ IN KM OW RX', 'Reflector: Thin C']);
    expect(within(screen.getByRole('region', { name: 'Settings' })).getByText('Beta I II III, Thin C, 10 plug pairs')).toBeTruthy();
    expect(screen.getByText('Thin rotor, rotor Beta, shows A')).toBeTruthy();
    expect(screen.getByText('Left rotor, rotor I, shows B')).toBeTruthy();
    typeKeys('WETTERBERICHT');
    expect(strip('Lamps lit')).toBe('OJPBC PNRAS YIM');
  });

  it('switches back to the Enigma I, which lights PBJGO LIZQM QGZ again', () => {
    renderWithIntl(<EnigmaLab />);
    fireEvent.click(within(machine()).getByRole('radio', { name: 'Naval M4' }));
    typeKeys('WET');
    fireEvent.click(within(machine()).getByRole('radio', { name: 'Enigma I' }));
    expect(strip('Lamps lit')).toBe('');
    expect(screen.queryByText(/^Thin rotor/)).toBeNull();
    typeKeys('WETTERBERICHT');
    expect(strip('Lamps lit')).toBe('PBJGO LIZQM QGZ');
  });

  it('closes a loaded message when the machine changes, because its key belongs to the other machine', () => {
    renderWithIntl(<EnigmaLab />);
    fireEvent.click(screen.getByRole('button', { name: 'Load into the machine: Practice 1: no plug pairs' }));
    expect(screen.getByRole('region', { name: 'Decrypting: Practice 1: no plug pairs' })).toBeTruthy();
    fireEvent.click(within(machine()).getByRole('radio', { name: 'Naval M4' }));
    expect(screen.queryByRole('region', { name: /^Decrypting/ })).toBeNull();
  });

  it('switches to the M4 when practice 4 loads, and its secret letters decrypt to the answer', () => {
    renderWithIntl(<EnigmaLab />);
    fireEvent.click(screen.getByRole('button', { name: 'Load into the machine: Practice 4: the naval M4' }));
    expect(within(machine()).getByRole<HTMLInputElement>('radio', { name: 'Naval M4' }).checked).toBe(true);
    expect(screen.getByText('Thin rotor, rotor Gamma, shows U')).toBeTruthy();
    const box = screen.getByRole('region', { name: 'Decrypting: Practice 4: the naval M4' });
    fireEvent.click(within(box).getByRole('button', { name: 'Type it for me' }));
    expect(strip('Lamps lit')).toBe('FOURX ROTOR SXFOR XTHEX NAVY');
    fireEvent.click(within(box).getByRole('button', { name: 'Check my answer' }));
    expect(within(box).getByText('Right! The message says: FOUR ROTORS FOR THE NAVY')).toBeTruthy();
  });
});
