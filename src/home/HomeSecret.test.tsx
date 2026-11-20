// @vitest-environment jsdom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { renderWithIntl } from '@/test/intl';
import { HomeSecret } from './HomeSecret';
import { SECRET_KEY } from './secret-storage';
import { forgetSecret, saveSecret } from './use-secret';

afterEach(() => {
  cleanup();
  forgetSecret();
});

const strip = (name: string) => screen.getByText(name).nextElementSibling?.textContent;
const textBox = () => screen.getByRole<HTMLTextAreaElement>('textbox', { name: 'Your message' });

describe('HomeSecret (spec R3 4, "Type your own secret")', () => {
  it('asks for a secret message and shows its settings in one line', () => {
    renderWithIntl(<HomeSecret />);
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Type a secret message');
    expect(
      screen.getByText(
        'Settings: rotors I II III, rings A A A, plug pairs AV BS CG DL FU HZ IN KM OW RX, reflector B, start B L A. The Enigma lab starts with the same settings.',
      ),
    ).toBeTruthy();
  });

  it('turns the typed text into secret letters, lights the last lamp, and saves both in the browser', () => {
    renderWithIntl(<HomeSecret />);
    fireEvent.change(textBox(), { target: { value: 'Wetterbericht!' } });
    expect(strip('Enigma types')).toBe('WETTE RBERI CHT');
    expect(strip('Secret letters')).toBe('PBJGO LIZQM QGZ');
    expect(document.querySelector('[data-lit]')?.textContent).toBe('Z');
    expect(screen.getByRole('status').textContent).toBe('Lamp Z');
    expect(JSON.parse(localStorage.getItem(SECRET_KEY) ?? 'null')).toMatchObject({ plain: 'Wetterbericht!', cipher: 'PBJGOLIZQMQGZ' });
  });

  it('shows the secret that the browser kept', () => {
    saveSecret('Hallo Welt');
    renderWithIntl(<HomeSecret />);
    expect(textBox().value).toBe('Hallo Welt');
    expect(strip('Enigma types')).toBe('HALLO XWELT');
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
});
