// @vitest-environment jsdom
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { renderWithIntl } from '@/test/intl';
import { LessonEncoding } from './LessonEncoding';

afterEach(cleanup);

const figure = () => screen.getByRole('figure', { name: 'Turing’s first machine, written as a description' });
const rows = () => within(figure()).getAllByRole('row').slice(1);
/** The marked parts of the standard description and the description number. */
const marked = () => [...figure().querySelectorAll('mark')].map((mark) => mark.textContent);

describe('LessonEncoding (spec R2b 2: lesson 3)', () => {
  it('shows the rule table of Turing’s first machine, one row for each rule', () => {
    renderWithIntl(<LessonEncoding />);
    const headers = within(figure()).getAllByRole('columnheader').map((cell) => cell.textContent);
    expect(headers).toEqual(['If in state', 'and reading', 'operations', 'then go to', 'In letters']);
    expect(rows().map((row) => within(row).getAllByRole('cell').map((cell) => cell.textContent))).toEqual([
      ['blank', 'P0, R', '𝔠', 'q1 S0 S1 R q2DADDCRDAA;'],
      ['blank', 'R', '𝔢', 'q2 S0 S0 R q3DAADDRDAAA;'],
      ['blank', 'P1, R', '𝔨', 'q3 S0 S2 R q4DAAADDCCRDAAAA;'],
      ['blank', 'R', '𝔟', 'q4 S0 S0 R q1DAAAADDRDA;'],
    ]);
    expect(rows().map((row) => within(row).getByRole('rowheader').textContent)).toEqual(['𝔟', '𝔠', '𝔢', '𝔨']);
  });

  it('shows the standard description and the description number that Turing prints on p. 241', () => {
    renderWithIntl(<LessonEncoding />);
    expect(screen.getByTestId('encoding-sd').textContent).toBe('DADDCRDAA;DAADDRDAAA;DAAADDCCRDAAAA;DAAAADDRDA;');
    expect(screen.getByTestId('encoding-dn').textContent).toBe('31332531173113353111731113322531111731111335317');
    expect(marked()).toEqual([]);
  });

  it('marks the part of a row in both strings while the row has the keyboard focus', () => {
    renderWithIntl(<LessonEncoding />);
    expect(rows().every((row) => row.tabIndex === 0)).toBe(true);
    fireEvent.focus(rows()[1]);
    expect(marked()).toEqual(['DAADDRDAAA;', '31133531117']);
    fireEvent.focus(rows()[2]);
    expect(marked()).toEqual(['DAAADDCCRDAAAA;', '311133225311117']);
    fireEvent.blur(rows()[2]);
    expect(marked()).toEqual([]);
  });

  it('marks the part of a row while the pointer is on it', () => {
    renderWithIntl(<LessonEncoding />);
    fireEvent.mouseEnter(rows()[0]);
    expect(marked()).toEqual(['DADDCRDAA;', '3133253117']);
    expect(rows()[0].getAttribute('data-active')).toBe('true');
    fireEvent.mouseLeave(rows()[0]);
    expect(marked()).toEqual([]);
    expect(rows()[0].getAttribute('data-active')).toBeNull();
  });

  it('tells how to mark a row, in words', () => {
    renderWithIntl(<LessonEncoding />);
    expect(within(figure()).getByText(/^Point at a row, tap it, or move to it with Tab\./)).toBeTruthy();
  });
});
