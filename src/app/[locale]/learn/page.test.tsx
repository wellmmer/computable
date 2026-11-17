// @vitest-environment jsdom
import { act, cleanup, fireEvent, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { resetProgress, saveQuizResult } from '@/learn/progress';
import { renderWithIntl } from '@/test/intl';
import LearnPage from './page';

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
  resetProgress();
});

const lessonRow = (number = 1) => screen.getAllByRole('listitem')[number - 1];

describe('Learn page (spec 2.1)', () => {
  it('lists the live lessons with their number, title, summary and reading time', () => {
    renderWithIntl(<LearnPage />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Learn');
    // Lessons 5 and 6 have no machine (spec R2b 2), so the lead says "most lessons".
    expect(screen.getByText('Short lessons about the Turing machine. Most lessons have machines you can run. Each lesson ends with a quiz.')).toBeTruthy();
    expect(screen.getAllByRole('listitem')).toHaveLength(6);
    expect(within(lessonRow()).getByText('Lesson 1')).toBeTruthy();
    expect(within(lessonRow()).getByRole('link', { name: 'Intuition: the human computer' }).getAttribute('href')).toBe('/learn/intuition');
    expect(within(lessonRow()).getByText(/^How Turing turned a person/)).toBeTruthy();
    expect(within(lessonRow()).getByText('7 min read')).toBeTruthy();
    expect(within(lessonRow(2)).getByText('Lesson 2')).toBeTruthy();
    expect(within(lessonRow(2)).getByRole('link', { name: 'The formal definition' }).getAttribute('href')).toBe('/learn/formal-definition');
    expect(within(lessonRow(2)).getByText(/^The seven parts of a Turing machine/)).toBeTruthy();
    expect(within(lessonRow(2)).getByText('7 min read')).toBeTruthy();
    expect(within(lessonRow(3)).getByText('Lesson 3')).toBeTruthy();
    expect(within(lessonRow(3)).getByRole('link', { name: 'The universal machine' }).getAttribute('href')).toBe('/learn/universal-machine');
    expect(within(lessonRow(3)).getByText('6 min read')).toBeTruthy();
    expect(within(lessonRow(4)).getByText('Lesson 4')).toBeTruthy();
    expect(within(lessonRow(4)).getByRole('link', { name: 'The halting problem' }).getAttribute('href')).toBe('/learn/halting-problem');
    expect(within(lessonRow(4)).getByText('7 min read')).toBeTruthy();
    expect(within(lessonRow(5)).getByText('Lesson 5')).toBeTruthy();
    expect(within(lessonRow(5)).getByRole('link', { name: 'The Entscheidungs\u00ADproblem' }).getAttribute('href')).toBe('/learn/entscheidungsproblem');
    expect(within(lessonRow(5)).getByText('6 min read')).toBeTruthy();
    expect(within(lessonRow(6)).getByText('Lesson 6')).toBeTruthy();
    expect(within(lessonRow(6)).getByRole('link', { name: 'The Church–Turing thesis' }).getAttribute('href')).toBe('/learn/church-turing');
    expect(within(lessonRow(6)).getByText('6 min read')).toBeTruthy();
    // R2c, the reading guide to Turing's paper, still comes later.
    expect(screen.getByText('More lessons come later.')).toBeTruthy();
  });

  it('shows the quiz status of each lesson', () => {
    renderWithIntl(<LearnPage />);
    expect(within(lessonRow()).getByText('Not started')).toBeTruthy();
    act(() => saveQuizResult('intuition', 4, 5));
    expect(within(lessonRow()).getByText('Quiz: 4 of 5')).toBeTruthy();
    expect(within(lessonRow(2)).getByText('Not started')).toBeTruthy();
    act(() => saveQuizResult('formal-definition', 3, 5));
    expect(within(lessonRow(2)).getByText('Quiz: 3 of 5')).toBeTruthy();
  });

  it('asks before it resets the progress, and Cancel keeps it', () => {
    renderWithIntl(<LearnPage />);
    act(() => saveQuizResult('intuition', 4, 5));
    fireEvent.click(screen.getByRole('button', { name: 'Reset my progress' }));
    const question = screen.getByRole('group', { name: 'Clear all your quiz results in this browser?' });
    expect(document.activeElement).toBe(within(question).getByRole('button', { name: 'Cancel' }));
    fireEvent.click(within(question).getByRole('button', { name: 'Cancel' }));
    expect(within(lessonRow()).getByText('Quiz: 4 of 5')).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Reset my progress' }));
  });

  it('clears every quiz result after the confirmation', () => {
    renderWithIntl(<LearnPage />);
    act(() => saveQuizResult('intuition', 4, 5));
    fireEvent.click(screen.getByRole('button', { name: 'Reset my progress' }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes, clear them' }));
    expect(within(lessonRow()).getByText('Not started')).toBeTruthy();
    expect(screen.getByRole('status').textContent).toBe('Your quiz results are cleared.');
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Reset my progress' }));
  });
});
