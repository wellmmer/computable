// @vitest-environment jsdom
import { cleanup, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithIntl } from '@/test/intl';
import EnigmaPage from './page';

// The real Link needs the Next.js router, which screen tests do not have.
vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

afterEach(cleanup);

describe('the Enigma lab page (spec R3 3)', () => {
  it('has the title, the lead and the machine', () => {
    renderWithIntl(<EnigmaPage />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Enigma lab');
    expect(screen.getByText('Type a letter on your keyboard or tap a key. A lamp lights the secret letter.')).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Keyboard' })).toBeTruthy();
  });

  it('has the M4 history under the messages (spec R5a 4)', () => {
    renderWithIntl(<EnigmaPage />);
    const [messages, history] = [screen.getByRole('heading', { level: 2, name: 'Messages to decrypt' }), screen.getByRole('heading', { level: 2, name: 'The M4 and the Bombes' })];
    expect(messages.compareDocumentPosition(history) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
