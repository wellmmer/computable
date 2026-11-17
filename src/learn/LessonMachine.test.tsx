// @vitest-environment jsdom
import { act, cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { machineFromHash } from '@/share/share-link';
import { examples } from '@/simulator/examples';
import { MACHINE_KEY } from '@/storage/machine-storage';
import { renderWithIntl } from '@/test/intl';
import { LessonMachine } from './LessonMachine';

beforeEach(() => vi.useFakeTimers());

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  localStorage.clear();
});

const figure = (name: string) => screen.getByRole('figure', { name });
const sentence = (name: string) => within(figure(name)).getByTestId('step-sentence').textContent;

describe('LessonMachine (spec 2.3)', () => {
  it("shows the example's name, its tape and the step sentence, and never runs by itself", () => {
    renderWithIntl(<LessonMachine example="binary-plus-one" />);
    expect(within(figure('Binary +1')).getByRole('region', { name: 'Tape of Binary +1' })).toBeTruthy();
    act(() => vi.advanceTimersByTime(5000));
    expect(sentence('Binary +1')).toBe('Ready. The head starts on cell 0 in state q0.');
  });

  it('makes one step with Step', () => {
    renderWithIntl(<LessonMachine example="binary-plus-one" />);
    fireEvent.click(within(figure('Binary +1')).getByRole('button', { name: 'Step' }));
    expect(sentence('Binary +1')).toBe('In q0 reading 1: write 1, move right, go to q0.');
  });

  it('runs to the end with Run, then says the result', () => {
    renderWithIntl(<LessonMachine example="binary-plus-one" />);
    fireEvent.click(within(figure('Binary +1')).getByRole('button', { name: 'Run' }));
    expect(within(figure('Binary +1')).getByRole('button', { name: 'Pause' })).toBeTruthy();
    act(() => vi.advanceTimersByTime(10 * 700));
    expect(within(figure('Binary +1')).getByTestId('result-line').textContent).toBe('Accepted after 8 steps. The tape now reads 1100.');
    expect(within(figure('Binary +1')).getByRole('button', { name: 'Run' })).toBeTruthy();
    expect(within(figure('Binary +1')).getByRole('button', { name: 'Step' }).hasAttribute('disabled')).toBe(true);
  });

  it('pauses with Pause, and goes back to the start with Reset', () => {
    renderWithIntl(<LessonMachine example="turing-1936" />);
    const machine = figure('Turing 1936: 0 1 0 1…');
    fireEvent.click(within(machine).getByRole('button', { name: 'Run' }));
    act(() => vi.advanceTimersByTime(2 * 700));
    fireEvent.click(within(machine).getByRole('button', { name: 'Pause' }));
    const paused = sentence('Turing 1936: 0 1 0 1…');
    act(() => vi.advanceTimersByTime(5 * 700));
    expect(sentence('Turing 1936: 0 1 0 1…')).toBe(paused);
    fireEvent.click(within(machine).getByRole('button', { name: 'Reset' }));
    expect(sentence('Turing 1936: 0 1 0 1…')).toBe('Ready. The head starts on cell 0 in state 𝔟.');
  });

  it('opens the same machine in the simulator through a share link', () => {
    renderWithIntl(<LessonMachine example="turing-1936" />);
    const href = within(figure('Turing 1936: 0 1 0 1…')).getByRole('link', { name: 'Open in the simulator' }).getAttribute('href') ?? '';
    expect(href.startsWith('/en/simulator#m=')).toBe(true);
    expect(machineFromHash(href.slice(href.indexOf('#')))).toEqual({ kind: 'machine', machine: examples['turing-1936'].machine });
  });

  it('gives each machine its own store, and never touches the machine saved in the simulator', () => {
    renderWithIntl(
      <>
        <LessonMachine example="turing-1936" />
        <LessonMachine example="binary-plus-one" />
      </>,
    );
    fireEvent.click(within(figure('Binary +1')).getByRole('button', { name: 'Step' }));
    expect(sentence('Turing 1936: 0 1 0 1…')).toBe('Ready. The head starts on cell 0 in state 𝔟.');
    expect(localStorage.getItem(MACHINE_KEY)).toBeNull();
  });
});
