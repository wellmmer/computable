// @vitest-environment jsdom
import { act, cleanup, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ExampleNote } from './ExampleNote';
import { renderSimulator } from './test-utils';

// The real Link needs the Next.js router, which screen tests do not have.
vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

afterEach(cleanup);

describe('ExampleNote', () => {
  it('shows nothing for the other examples', () => {
    const { container } = renderSimulator(<ExampleNote />);
    expect(container.textContent).toBe('');
  });

  it('for the one-rotor cipher, gives the rule count, the 676 rules for 26 letters, and a link to the lab', () => {
    const { store } = renderSimulator(<ExampleNote />);
    act(() => store.getState().loadExample('one-rotor'));
    const note = screen.getByTestId('example-note');
    expect(note.textContent).toContain('4 positions × 4 letters = 16 rules');
    expect(note.textContent).toContain('26 × 26 = 676 rules');
    expect(screen.getByRole('link', { name: 'Enigma lab' }).getAttribute('href')).toBe('/enigma');
  });

  it('goes away when the machine is no longer the example', () => {
    const { store } = renderSimulator(<ExampleNote />);
    act(() => store.getState().loadExample('one-rotor'));
    act(() => store.getState().renameMachine('My cipher'));
    expect(screen.queryByTestId('example-note')).toBeNull();
  });
});
