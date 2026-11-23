// @vitest-environment jsdom
import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { renderWithIntl } from '@/test/intl';
import BombePage from './page';

afterEach(cleanup);

describe('the Bombe lab page (spec R4 3)', () => {
  it('has the title, the lead and the lab', () => {
    renderWithIntl(<BombePage />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Bombe');
    expect(screen.getByText('Give the Bombe a word you know is in the message. It finds the key.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Start' })).toBeTruthy();
  });

  it('has the history under the lab (spec R4 5)', () => {
    renderWithIntl(<BombePage />);
    const [lab, history] = [screen.getByRole('heading', { level: 2, name: 'Stops' }), screen.getByRole('heading', { level: 2, name: 'How the Bombe came to be' })];
    expect(lab.compareDocumentPosition(history) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
