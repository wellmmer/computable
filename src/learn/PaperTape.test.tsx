// @vitest-environment jsdom
import { act, cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithIntl } from '@/test/intl';
import { PaperTape } from './PaperTape';

/** A stand-in for IntersectionObserver: the test calls `fire()` where the browser would call back. */
class FakeObserver {
  static last: FakeObserver | null = null;
  observed: Element[] = [];
  constructor(readonly callback: () => void) {
    FakeObserver.last = this;
  }
  observe(element: Element) {
    this.observed.push(element);
  }
  disconnect() {
    this.observed = [];
  }
  fire() {
    this.callback();
  }
}

/** Answers `prefers-reduced-motion: reduce` with `reduce`. */
function stubMotion(reduce: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: reduce && query.includes('reduce'),
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

/** Parts of the guide. Each one's top is read from `tops` when asked, so a test can scroll by changing it. */
function Parts({ tops }: { tops: number[] }) {
  return (
    <>
      {tops.map((_, index) => (
        <section
          key={index}
          data-paper-part=""
          ref={(element) => {
            if (element !== null) element.getBoundingClientRect = () => ({ top: tops[index] }) as DOMRect;
          }}
        />
      ))}
    </>
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  FakeObserver.last = null;
});

const tape = () => screen.getByRole('figure', { name: 'Turing 1936: 0 1 0 1…' });

describe('PaperTape (spec R2c 3)', () => {
  it("shows Turing's first machine at its start, with its tape", () => {
    renderWithIntl(<PaperTape />);
    expect(within(tape()).getByRole('region', { name: 'Tape of Turing 1936: 0 1 0 1…' })).toBeTruthy();
    expect(within(tape()).getByText('Step 0')).toBeTruthy();
  });

  it('moves one step for each part whose top has passed the middle of the window, and steps back on the way up', () => {
    stubMotion(false);
    vi.stubGlobal('IntersectionObserver', FakeObserver);
    // jsdom's window is 768 px high, so the reading line is at 384 px.
    const tops = [100, 300, 900];
    renderWithIntl(
      <>
        <PaperTape />
        <Parts tops={tops} />
      </>,
    );
    expect(FakeObserver.last?.observed).toHaveLength(3);
    act(() => FakeObserver.last?.fire());
    expect(within(tape()).getByText('Step 2')).toBeTruthy();
    expect(within(tape()).getByTestId('head-state').textContent).toBe('𝔢');

    tops.splice(0, 3, 500, 700, 1300);
    act(() => FakeObserver.last?.fire());
    expect(within(tape()).getByText('Step 0')).toBeTruthy();
  });

  it('has no buttons and no live region while the scroll moves it', () => {
    stubMotion(false);
    vi.stubGlobal('IntersectionObserver', FakeObserver);
    renderWithIntl(<PaperTape />);
    expect(within(tape()).queryAllByRole('button')).toEqual([]);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('shows Step and Reset instead when the visitor asks for reduced motion, and ignores the scroll', () => {
    stubMotion(true);
    vi.stubGlobal('IntersectionObserver', FakeObserver);
    renderWithIntl(
      <>
        <PaperTape />
        <Parts tops={[100, 300, 900]} />
      </>,
    );
    expect(FakeObserver.last).toBeNull();
    fireEvent.click(within(tape()).getByRole('button', { name: 'Step' }));
    fireEvent.click(within(tape()).getByRole('button', { name: 'Step' }));
    expect(within(tape()).getByText('Step 2')).toBeTruthy();
    // A press is spoken once, politely.
    expect(screen.getByRole('status').textContent).toBe('In 𝔠 reading _: move right, go to 𝔢.');
    fireEvent.click(within(tape()).getByRole('button', { name: 'Reset' }));
    expect(within(tape()).getByText('Step 0')).toBeTruthy();
  });

  it('shows Step and Reset when the browser has no IntersectionObserver', () => {
    stubMotion(false);
    renderWithIntl(<PaperTape />);
    expect(within(tape()).getByRole('button', { name: 'Step' })).toBeTruthy();
    expect(within(tape()).getByRole('button', { name: 'Reset' })).toBeTruthy();
  });
});
