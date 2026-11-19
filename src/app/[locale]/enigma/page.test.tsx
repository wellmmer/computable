// @vitest-environment jsdom
import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { renderWithIntl } from '@/test/intl';
import EnigmaPage from './page';

afterEach(cleanup);

describe('the Enigma lab page (spec R3 3)', () => {
  it('has the title, the lead and the machine', () => {
    renderWithIntl(<EnigmaPage />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Enigma I');
    expect(screen.getByText('Type a letter on your keyboard or tap a key. A lamp lights the secret letter.')).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Keyboard' })).toBeTruthy();
  });
});
