// @vitest-environment jsdom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { isLetter } from '@/engines/enigma';
import { renderWithIntl } from '@/test/intl';
import { CurrentPath } from './CurrentPath';
import { initialLab, labReducer, type LabState } from './lab-state';

afterEach(cleanup);

/** The lab after typing `text` with the default settings. */
function typed(text: string): LabState {
  return [...text].filter(isLetter).reduce((lab, key) => labReducer(lab, { type: 'press', key }), initialLab());
}

const T_PATH = 'Key T, plugboard T, rotor III P, rotor II P, rotor I W, reflector V, rotor I M, rotor II X, rotor III H, plugboard Z, lamp Z';

describe('CurrentPath (spec R3 3, "Path panel")', () => {
  it('asks for a key before the first letter', () => {
    const lab = initialLab();
    renderWithIntl(<CurrentPath settings={lab.settings} last={null} />);
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Where the current goes');
    expect(screen.getByText('Press a key to see the path.')).toBeTruthy();
    expect(screen.queryAllByRole('img')).toHaveLength(0);
  });

  it('draws the path of the last letter, T in WETTERBERICHT, as in the mockup', () => {
    const lab = typed('WETTERBERICHT');
    renderWithIntl(<CurrentPath settings={lab.settings} last={lab.typed.at(-1) ?? null} />);
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Where the current went for T');
    // One drawing across for wide screens, one top to bottom for phones. CSS shows one of them.
    const drawings = screen.getAllByRole('img', { name: T_PATH });
    expect(drawings).toHaveLength(2);
    for (const drawing of drawings) {
      expect([...drawing.querySelectorAll('[data-letter]')].map((circle) => circle.textContent).join('')).toBe('TTPPWVMXHZZ');
      expect([...drawing.querySelectorAll('[data-swap]')].map((circle) => circle.textContent)).toEqual(['Z']);
      expect(drawing.querySelector('[data-lamp]')?.textContent).toBe('Z');
      expect([...drawing.querySelectorAll('[data-part-label]')].map((label) => label.textContent)).toEqual([
        'Key, lamp',
        'Plugboard',
        'Rotor III',
        'Rotor II',
        'Rotor I',
        'Reflector',
      ]);
    }
    expect(screen.getByText('The plug pair HZ turned H into Z (red ring).')).toBeTruthy();
    expect(screen.getByText('The current always comes back on a different wire, so a letter never lights itself.')).toBeTruthy();
  });

  it('marks a swap on the way in too: W goes through the plug pair OW', () => {
    const lab = typed('W');
    renderWithIntl(<CurrentPath settings={lab.settings} last={lab.typed[0]} />);
    expect(screen.getByText('The plug pair OW turned W into O (red ring).')).toBeTruthy();
  });

  it('says a swap once when both swaps are the same: key A at A C F goes A to V on the way in and on the way back', () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const lab = labReducer({ ...initialLab(), positions: ['A', 'C', 'F'] }, { type: 'press', key: 'A' });
    const last = lab.typed[0];
    expect([last.path[0], last.path[1], last.path[8], last.path[9]].map(({ letter }) => letter).join('')).toBe('AVAV');
    renderWithIntl(<CurrentPath settings={lab.settings} last={last} />);
    expect(screen.getAllByText('The plug pair AV turned A into V (red ring).')).toHaveLength(1);
    expect(errors).not.toHaveBeenCalled();
    errors.mockRestore();
  });

  it('hides the drawing with the "Show the path" switch', () => {
    const lab = typed('WETTERBERICHT');
    renderWithIntl(<CurrentPath settings={lab.settings} last={lab.typed.at(-1) ?? null} />);
    const show = screen.getByRole('switch', { name: 'Show the path' });
    expect((show as HTMLInputElement).checked).toBe(true);
    fireEvent.click(show);
    expect(screen.queryAllByRole('img')).toHaveLength(0);
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Where the current went for T');
  });

  it('draws each of the 7 parts in its own column, including the Enigma I path in a 640 by 170 frame and a 300 by 500 frame', () => {
    const lab = typed('T');
    renderWithIntl(<CurrentPath settings={lab.settings} last={lab.typed[0]} />);
    expect(screen.getAllByRole('img').map((drawing) => drawing.getAttribute('viewBox'))).toEqual(['0 0 640 170', '0 0 300 500']);
  });
});

describe('CurrentPath for the naval M4 (spec R5a 3)', () => {
  it('draws the thin rotor between rotor I and the reflector, on the way out and on the way back', () => {
    const lab = [...'WETTERBERICHT'].filter(isLetter).reduce((next, key) => labReducer(next, { type: 'press', key }), labReducer(initialLab(), { type: 'model', model: 'M4' }));
    const last = lab.typed.at(-1) ?? null;
    if (last === null) throw new Error('nothing typed');
    renderWithIntl(<CurrentPath settings={lab.settings} last={last} />);
    const name = screen.getAllByRole('img')[0].getAttribute('aria-label') ?? '';
    expect(name.match(/rotor Beta [A-Z]/g)).toHaveLength(2);
    expect(name).toMatch(/^Key T, plugboard T, rotor III ., rotor II ., rotor I ., rotor Beta ., reflector ., rotor Beta ., rotor I ., rotor II ., rotor III ., plugboard ., lamp M$/);
    for (const drawing of screen.getAllByRole('img', { name })) {
      expect(drawing.querySelectorAll('[data-letter]')).toHaveLength(13);
      expect(drawing.querySelector('[data-lamp]')?.textContent).toBe('M');
      expect([...drawing.querySelectorAll('[data-part-label]')].map((label) => label.textContent)).toEqual([
        'Key, lamp',
        'Plugboard',
        'Rotor III',
        'Rotor II',
        'Rotor I',
        'Rotor Beta',
        'Reflector',
      ]);
    }
    expect(screen.getAllByRole('img').map((drawing) => drawing.getAttribute('viewBox'))).toEqual(['0 0 740 170', '0 0 300 580']);
  });
});
