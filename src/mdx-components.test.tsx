// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import Sample, { meta } from './test/sample.mdx';

afterEach(cleanup);

/** Stands in for the lesson's mini-simulator, so this test checks only the MDX setup. */
function Machine({ example }: { example: string }) {
  return <p data-testid="machine">{example}</p>;
}

describe('MDX files (spec 3)', () => {
  it('turn into a component that draws headings, paragraphs, links, quotes and lists in the site style', () => {
    render(<Sample components={{ Machine }} />);
    expect(screen.getByRole('heading', { level: 2, name: 'A heading' }).className).toContain('font-display');
    expect(screen.getByRole('link', { name: 'link' }).className).toContain('underline');
    expect(screen.getByText('A short quote.').closest('blockquote')?.className).toContain('border-pencil');
    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual(['One', 'Two']);
  });

  it('turn a markdown table into a table with a header row, in the site style (spec R2b 2)', () => {
    render(<Sample components={{ Machine }} />);
    const table = screen.getByRole('table');
    expect(within(table).getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual(['Machine', 'on M1', 'on M2']);
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows.map((row) => within(row).getAllByRole('cell').map((cell) => cell.textContent))).toEqual([
      ['M1', 'stops', 'forever'],
      ['M2', 'stops', 'forever'],
    ]);
    expect(table.className).toContain('w-full');
    expect(within(table).getAllByRole('columnheader')[0].className).toContain('border-b-2');
    expect(within(rows[0]).getAllByRole('cell')[0].className).toContain('border-b');
    expect(within(rows[0]).getByText('stops').tagName).toBe('STRONG');
  });

  it('take the components the page passes, with their props', () => {
    render(<Sample components={{ Machine }} />);
    expect(screen.getByTestId('machine').textContent).toBe('binary-plus-one');
  });

  it('export their meta', () => {
    expect(meta).toEqual({ title: 'A sample lesson', summary: 'One sentence.', minutes: 1 });
  });
});
