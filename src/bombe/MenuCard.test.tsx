// @vitest-environment jsdom
import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { buildMenu } from '@/engines/bombe';
import { renderWithIntl } from '@/test/intl';
import { MenuCard } from './MenuCard';
import { PRACTICE } from './practice-message';

afterEach(cleanup);

describe('MenuCard (spec R4 3, "Menu card")', () => {
  it('shows the loop count, the drawing and the center letter', () => {
    renderWithIntl(<MenuCard menu={buildMenu(PRACTICE.cipher, PRACTICE.crib, 0)} />);
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Menu: 3 loops');
    expect(screen.getByText('More loops, fewer false stops.')).toBeTruthy();
    const drawing = screen.getByRole('img', { name: '13 links between 11 letters. The test starts at H.' });
    expect(drawing.querySelectorAll('circle')).toHaveLength(11);
    expect(drawing.querySelectorAll('path')).toHaveLength(13);
    expect(screen.getByText('Each line is one crib letter on its secret letter. The test starts at H, the letter with the most lines.')).toBeTruthy();
  });

  it('asks for a crib when the menu has no links', () => {
    renderWithIntl(<MenuCard menu={buildMenu('', '', 0)} />);
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Menu: no loops');
    expect(screen.getByText('Place a crib under the secret letters to see its menu.')).toBeTruthy();
    expect(screen.queryByRole('img')).toBeNull();
  });
});
