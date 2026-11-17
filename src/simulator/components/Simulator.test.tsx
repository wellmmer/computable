// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { StrictMode } from 'react';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import en from '../../../messages/en.json';
import { machine } from '@/engines/turing/test-helpers';
import { shareUrl } from '@/share/share-link';
import { MACHINE_KEY } from '@/storage/machine-storage';
import { examples } from '../examples';
import { Simulator } from './Simulator';

const PAGE = '/en/simulator';

const linkHash = (id: keyof typeof examples) => {
  const link = shareUrl('https://x.example/en/simulator', examples[id].machine);
  if (!link.ok) throw new Error('expected a link');
  return new URL(link.url).hash;
};

/** A machine the visitor built: no example has it. */
const BUILT = machine([{ state: 'q0', read: '_', write: '1', move: 'R', next: 'qA' }], { name: 'My machine' });

beforeAll(() => {
  // jsdom has <dialog> but not showModal() or close().
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.open = false;
  };
});

const renderPage = () =>
  render(
    <StrictMode>
      <NextIntlClientProvider locale="en" messages={en}>
        <Simulator />
      </NextIntlClientProvider>
    </StrictMode>,
  );

const title = () => screen.getByRole('heading', { level: 1 }).textContent;

beforeEach(() => {
  window.localStorage.clear();
  window.history.replaceState(null, '', `${PAGE}?x=1`);
});

afterEach(cleanup);

describe('Simulator', () => {
  it('opens a share link pasted into an open tab, then goes back, so the next Back leaves the page', async () => {
    window.history.replaceState({ entry: 'before the link' }, '', `${PAGE}?x=1`);
    renderPage();
    expect(title()).toBe('Binary +1');
    // Pasting a link into the address bar adds a history entry with the hash.
    window.history.pushState(null, '', `${PAGE}?x=1${linkHash('palindrome')}`);
    act(() => {
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    expect(title()).toBe('Palindrome checker');
    // The page is back on the entry from before the paste, so the next Back leaves the page.
    await waitFor(() => expect(window.history.state).toEqual({ entry: 'before the link' }));
    expect(`${window.location.pathname}${window.location.search}${window.location.hash}`).toBe(`${PAGE}?x=1`);
    expect(title()).toBe('Palindrome checker');
  });

  it('shows the bad-link note when React runs the effect twice, as StrictMode does in dev', () => {
    window.history.replaceState(null, '', `${PAGE}#m=broken`);
    renderPage();
    expect(screen.getByText(en.simulator.notes.badLink)).toBeTruthy();
    expect(window.location.hash).toBe('');
  });

  describe('a share link over a machine the visitor built', () => {
    const openWithLink = () => {
      window.localStorage.setItem(MACHINE_KEY, JSON.stringify(BUILT));
      window.history.replaceState(null, '', `${PAGE}${linkHash('turing-1936')}`);
      renderPage();
      return screen.getByRole('dialog', { name: en.simulator.replaceLink.title });
    };

    it('asks first, with the focus on "Keep mine", and keeps the link in the address until the answer', () => {
      const dialog = openWithLink();
      expect(dialog.textContent).toContain(en.simulator.replaceLink.text);
      expect(document.activeElement).toBe(screen.getByRole('button', { name: en.simulator.replaceLink.keep }));
      expect(title()).toBe('My machine');
      expect(window.location.hash).toBe(linkHash('turing-1936'));
      expect(JSON.parse(window.localStorage.getItem(MACHINE_KEY) ?? 'null')).toMatchObject({ name: 'My machine' });
    });

    it('"Keep mine" keeps the machine and drops the link from the address', () => {
      openWithLink();
      fireEvent.click(screen.getByRole('button', { name: en.simulator.replaceLink.keep }));
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(title()).toBe('My machine');
      expect(window.location.hash).toBe('');
      expect(JSON.parse(window.localStorage.getItem(MACHINE_KEY) ?? 'null')).toMatchObject({ name: 'My machine' });
    });

    it('Esc means "Keep mine"', () => {
      const dialog = openWithLink();
      act(() => {
        dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
      });
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(title()).toBe('My machine');
      expect(window.location.hash).toBe('');
    });

    it('"Replace" opens the link and drops it from the address', () => {
      openWithLink();
      fireEvent.click(screen.getByRole('button', { name: en.simulator.replaceLink.replace }));
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(title()).toBe(examples['turing-1936'].machine.name);
      expect(window.location.hash).toBe('');
    });

    it('keeps the keyboard shortcuts off while it asks', () => {
      openWithLink();
      fireEvent.keyDown(document.body, { key: 'ArrowRight' });
      expect(screen.getByRole('dialog', { name: en.simulator.replaceLink.title })).toBeTruthy();
      fireEvent.click(screen.getByRole('button', { name: en.simulator.replaceLink.keep }));
      expect(screen.getByTestId('head-state').textContent).toBe('q0');
    });
  });
});
