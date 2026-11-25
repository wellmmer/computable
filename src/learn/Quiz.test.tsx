// @vitest-environment jsdom
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithIntl } from '@/test/intl';
import { resetProgress } from './progress';
import { parseProgress, PROGRESS_KEY } from './progress-storage';
import type { QuizQuestion } from './quiz-data';
import { Quiz } from './Quiz';

const QUESTIONS: QuizQuestion[] = [
  {
    id: 'tape',
    text: 'What became the tape?',
    answer: 'paper',
    options: [
      { id: 'paper', text: 'The squared paper', why: 'Turing kept one row of the squares.' },
      { id: 'pencil', text: 'The pencil', why: 'The pencil became the head, not the tape.' },
      { id: 'mind', text: 'The state of mind', why: 'The state of mind became the state.' },
    ],
  },
  {
    id: 'stops',
    text: 'When does the first machine stop?',
    answer: 'never',
    options: [
      { id: 'never', text: 'Never', why: 'Every rule sends it on to another state.' },
      { id: 'four', text: 'After four steps', why: 'After four steps it is back in its first state.' },
    ],
  },
];

afterEach(() => {
  cleanup();
  resetProgress();
  vi.unstubAllEnvs();
});

const question = (number: number) => screen.getByRole('group', { name: new RegExp(`^Question ${number} of 2`) });

function answer(number: number, option: string) {
  const group = question(number);
  fireEvent.click(within(group).getByRole('radio', { name: option }));
  fireEvent.click(within(group).getByRole('button', { name: 'Check' }));
}

describe('Quiz (spec 2.4)', () => {
  it('shows each question as a group of radio buttons, named by its legend', () => {
    renderWithIntl(<Quiz slug="intuition" questions={QUESTIONS} />);
    expect(screen.getByRole('heading', { level: 2, name: 'Check what you learned' })).toBeTruthy();
    expect(question(1).tagName).toBe('FIELDSET');
    expect(within(question(1)).getAllByRole('radio').map((radio) => radio.getAttribute('value'))).toEqual(['paper', 'pencil', 'mind']);
    expect(within(question(2)).getAllByRole('radio')).toHaveLength(2);
  });

  it('enables Check once an option is chosen', () => {
    renderWithIntl(<Quiz slug="intuition" questions={QUESTIONS} />);
    const check = within(question(1)).getByRole('button', { name: 'Check' });
    expect(check.hasAttribute('disabled')).toBe(true);
    fireEvent.click(within(question(1)).getByRole('radio', { name: 'The pencil' }));
    expect(check.hasAttribute('disabled')).toBe(false);
  });

  it('says a right answer is right, and why, and moves the focus to that sentence', () => {
    renderWithIntl(<Quiz slug="intuition" questions={QUESTIONS} />);
    answer(1, 'The squared paper');
    const feedback = within(question(1)).getByText('Turing kept one row of the squares.').closest('p');
    expect(feedback?.textContent).toBe('Right. Turing kept one row of the squares.');
    expect(document.activeElement).toBe(feedback);
    expect(within(question(1)).queryByRole('button', { name: 'Check' })).toBeNull();
    for (const radio of within(question(1)).getAllByRole('radio')) expect(radio.hasAttribute('disabled')).toBe(true);
  });

  it('says a wrong answer is wrong, why, and which answer is right', () => {
    renderWithIntl(<Quiz slug="intuition" questions={QUESTIONS} />);
    answer(1, 'The pencil');
    expect(within(question(1)).getByText('The pencil became the head, not the tape.').closest('p')?.textContent).toBe(
      'Not quite. The pencil became the head, not the tape.',
    );
    expect(within(question(1)).getByRole('radio', { name: 'The squared paper Right answer' })).toBeTruthy();
    expect(within(question(1)).getByRole('radio', { name: 'The pencil Your answer' })).toBeTruthy();
  });

  it('shows the score after the last question, and saves it in the browser', () => {
    renderWithIntl(<Quiz slug="intuition" questions={QUESTIONS} />);
    expect(screen.getByRole('status').textContent).toBe('');
    answer(1, 'The pencil');
    expect(screen.getByRole('status').textContent).toBe('');
    answer(2, 'Never');
    expect(screen.getByRole('status').textContent).toBe('You got 1 of 2 right. Your result is saved in this browser only.');
    expect(parseProgress(localStorage.getItem(PROGRESS_KEY)).intuition).toMatchObject({ best: 1, total: 2 });
  });

  it('says the account keeps a copy when the site has accounts (spec R5b 5)', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'public-key');
    renderWithIntl(<Quiz slug="intuition" questions={QUESTIONS} />);
    answer(1, 'The pencil');
    answer(2, 'Never');
    expect(screen.getByRole('status').textContent).toBe(
      'You got 1 of 2 right. Your result is saved in this browser. If you are signed in, your account keeps a copy.',
    );
  });

  it('clears the answers on Try again, and keeps the best score', () => {
    renderWithIntl(<Quiz slug="intuition" questions={QUESTIONS} />);
    answer(1, 'The squared paper');
    answer(2, 'Never');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(screen.getByRole('status').textContent).toBe('');
    expect(document.activeElement).toBe(screen.getByRole('heading', { level: 2, name: 'Check what you learned' }));
    for (const radio of screen.getAllByRole('radio')) {
      expect((radio as HTMLInputElement).checked).toBe(false);
      expect(radio.hasAttribute('disabled')).toBe(false);
    }
    answer(1, 'The pencil');
    answer(2, 'After four steps');
    expect(screen.getByRole('status').textContent).toBe('You got 0 of 2 right. Your result is saved in this browser only.');
    expect(parseProgress(localStorage.getItem(PROGRESS_KEY)).intuition).toMatchObject({ best: 2, total: 2 });
  });
});
