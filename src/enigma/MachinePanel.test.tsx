// @vitest-environment jsdom
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithIntl } from '@/test/intl';
import { MachinePanel } from './MachinePanel';

afterEach(cleanup);

function renderPanel(lit: 'Z' | null = 'Z') {
  const onPress = vi.fn();
  const onTurn = vi.fn();
  renderWithIntl(
    <MachinePanel rotors={['I', 'II', 'III']} positions={['B', 'L', 'N']} lit={lit} lastKey={lit === null ? null : 'T'} onPress={onPress} onTurn={onTurn} />,
  );
  return { onPress, onTurn };
}

describe('MachinePanel (spec R3 3, "Machine panel")', () => {
  it('shows the three rotor windows, left to right, with their rotor names', () => {
    renderPanel();
    expect(screen.getByText('Left rotor, rotor I, shows B')).toBeTruthy();
    expect(screen.getByText('Middle rotor, rotor II, shows L')).toBeTruthy();
    expect(screen.getByText('Right rotor, rotor III, shows N')).toBeTruthy();
    expect(screen.getByText('The right rotor turns one step before each letter.')).toBeTruthy();
  });

  it('turns a rotor with its ▲ and ▼ buttons', () => {
    const { onTurn } = renderPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Right rotor: next letter' }));
    fireEvent.click(screen.getByRole('button', { name: 'Left rotor: previous letter' }));
    expect(onTurn.mock.calls).toEqual([
      [2, 1],
      [0, -1],
    ]);
  });

  it('has a real button for each of the 26 keys, in the German rows QWERTZUIO, ASDFGHJK, PYXCVBNML', () => {
    const { onPress } = renderPanel();
    const keyboard = screen.getByRole('group', { name: 'Keyboard' });
    const keys = within(keyboard).getAllByRole('button');
    expect(keys.map((key) => key.textContent).join('')).toBe('QWERTZUIOASDFGHJKPYXCVBNML');
    fireEvent.click(within(keyboard).getByRole('button', { name: 'W' }));
    expect(onPress).toHaveBeenCalledWith('W');
  });

  it('lights one lamp, in the same rows, and hides the lampboard from screen readers', () => {
    renderPanel('Z');
    const lamps = document.body.querySelectorAll('[data-lamp]');
    expect([...lamps].map((lamp) => lamp.textContent).join('')).toBe('QWERTZUIOASDFGHJKPYXCVBNML');
    expect([...document.body.querySelectorAll('[data-lamp][data-lit]')].map((lamp) => lamp.textContent)).toEqual(['Z']);
    expect(document.body.querySelector('[data-lampboard]')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('lights no lamp before the first key', () => {
    renderPanel(null);
    expect(document.body.querySelectorAll('[data-lamp][data-lit]')).toHaveLength(0);
  });
});
