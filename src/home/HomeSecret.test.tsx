// @vitest-environment jsdom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { encrypt } from '@/engines/enigma';
import { groupsOf5 } from '@/enigma/lab-state';
import { renderWithIntl } from '@/test/intl';
import { HomeSecret } from './HomeSecret';
import type { SecretKey } from './random-key';
import { SECRET_KEY, type SavedSecret } from './secret-storage';
import { forgetSecret, saveSecret } from './use-secret';

// The real Link needs the Next.js router, which screen tests do not have.
vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

afterEach(() => {
  cleanup();
  forgetSecret();
  vi.restoreAllMocks();
});

/** The key every secret got before R4b: the lab's first settings. */
const R3_KEY: SecretKey = {
  settings: { rotors: ['I', 'II', 'III'], rings: ['A', 'A', 'A'], reflector: 'B', plugs: ['AV', 'BS', 'CG', 'DL', 'FU', 'HZ', 'IN', 'KM', 'OW', 'RX'] },
  start: ['B', 'L', 'A'],
};

const strip = (name: string) => screen.getByText(name).nextElementSibling?.textContent;
const textBox = () => screen.getByRole<HTMLTextAreaElement>('textbox', { name: 'Your message' });
const saved = (): SavedSecret => JSON.parse(localStorage.getItem(SECRET_KEY) ?? 'null');

describe('HomeSecret (spec R3 4, "Type your own secret", and spec R4 4)', () => {
  it('asks for a secret message, and keeps its key hidden', () => {
    saveSecret('Hallo', () => R3_KEY);
    renderWithIntl(<HomeSecret />);
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Type a secret message');
    expect(screen.getByText('Each new secret gets its own random Enigma key. Home keeps the key hidden.')).toBeTruthy();
    expect(screen.queryByText(/Settings:|rotors|AV BS/)).toBeNull();
  });

  it('turns the typed text into secret letters with the saved key, lights the last lamp, and saves both in the browser', () => {
    renderWithIntl(<HomeSecret />);
    fireEvent.change(textBox(), { target: { value: 'Wetterbericht!' } });
    const { settings, start, cipher } = saved();
    expect(cipher).toBe(encrypt(settings, start, 'WETTERBERICHT'));
    expect(strip('Enigma types')).toBe('WETTE RBERI CHT');
    expect(strip('Secret letters')).toBe(groupsOf5(cipher));
    expect(document.querySelector('[data-lit]')?.textContent).toBe(cipher.at(-1));
    expect(screen.getByRole('status').textContent).toBe(`Lamp ${cipher.at(-1)}`);
  });

  it('keeps the key while the visitor types more, and draws a new one after "Forget my secret"', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    renderWithIntl(<HomeSecret />);
    fireEvent.change(textBox(), { target: { value: 'Wetter' } });
    const first = saved();
    fireEvent.change(textBox(), { target: { value: 'Wetterbericht' } });
    expect(saved()).toMatchObject({ settings: first.settings, start: first.start });
    expect(saved().cipher.startsWith(first.cipher)).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Forget my secret' }));
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    fireEvent.change(textBox(), { target: { value: 'Wetter' } });
    expect(saved().settings).not.toEqual(first.settings);
  });

  it('reads a lamp aloud only after a key press, and says which letter Backspace removed', () => {
    saveSecret('Wetterbericht', () => R3_KEY);
    renderWithIntl(<HomeSecret />);
    expect(screen.getByRole('status').textContent).toBe('');
    fireEvent.change(textBox(), { target: { value: 'Wetterberich' } });
    expect(screen.getByRole('status').textContent).toBe('Removed T');
    fireEvent.change(textBox(), { target: { value: 'Wetterbericht' } });
    expect(screen.getByRole('status').textContent).toBe('Lamp Z');
    fireEvent.change(textBox(), { target: { value: 'Wetterbericht!' } });
    expect(screen.getByRole('status').textContent).toBe('');
  });

  it('shows the secret that the browser kept, with the secret letters it saved', () => {
    saveSecret('Wetterbericht', () => R3_KEY);
    renderWithIntl(<HomeSecret />);
    expect(textBox().value).toBe('Wetterbericht');
    expect(strip('Secret letters')).toBe('PBJGO LIZQM QGZ');
  });

  it('links to the Enigma lab and the Bombe with "#my-secret", once there are secret letters', () => {
    renderWithIntl(<HomeSecret />);
    expect(screen.queryByRole('link')).toBeNull();
    fireEvent.change(textBox(), { target: { value: '123' } });
    expect(screen.queryByRole('link')).toBeNull();
    fireEvent.change(textBox(), { target: { value: 'Hallo' } });
    expect(screen.getByRole('link', { name: 'Load my secret into the lab' }).getAttribute('href')).toBe('/enigma#my-secret');
    expect(screen.getByRole('link', { name: 'Break it with the Bombe' }).getAttribute('href')).toBe('/bombe#my-secret');
    expect(screen.getByText('To break it, the Bombe needs a crib: about 15 letters you know are in your secret.')).toBeTruthy();
  });

  it('forgets the secret', () => {
    renderWithIntl(<HomeSecret />);
    const forget = screen.getByRole<HTMLButtonElement>('button', { name: 'Forget my secret' });
    expect(forget.disabled).toBe(true);
    fireEvent.change(textBox(), { target: { value: 'Hallo' } });
    fireEvent.click(forget);
    expect(textBox().value).toBe('');
    expect(strip('Secret letters')).toBe('');
    expect(localStorage.getItem(SECRET_KEY)).toBeNull();
  });

  it('moves the focus to the text field after "Forget my secret", which turns itself off', () => {
    saveSecret('Hallo');
    renderWithIntl(<HomeSecret />);
    const forget = screen.getByRole<HTMLButtonElement>('button', { name: 'Forget my secret' });
    forget.focus();
    fireEvent.click(forget);
    expect(forget.disabled).toBe(true);
    expect(document.activeElement).toBe(textBox());
  });
});
