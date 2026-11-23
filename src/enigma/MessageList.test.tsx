// @vitest-environment jsdom
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithIntl } from '@/test/intl';
import { MessageList } from './MessageList';

afterEach(cleanup);

/** The terms and values of a key sheet, as "Rotors: I II III". */
const facts = (card: HTMLElement) =>
  within(card)
    .getAllByRole('term')
    .map((term) => `${term.textContent}: ${term.nextElementSibling?.textContent}`);

describe('MessageList (spec R3 4)', () => {
  it('shows 3 practice key sheets, the first without plug pairs', () => {
    renderWithIntl(<MessageList onLoad={() => {}} />);
    const first = screen.getByRole('article', { name: 'Practice 1: no plug pairs' });
    expect(facts(first)).toEqual(['Rotors: I II III', 'Rings: A A A', 'Plug pairs: No plug pairs', 'Reflector: B', 'Start: A A A']);
    expect(within(first).getByText('ILBDA SDTMV HFEBU AWAOM QEQGT')).toBeTruthy();
    expect(screen.getByRole('article', { name: 'Practice 2: plug pairs' })).toBeTruthy();
    expect(facts(screen.getByRole('article', { name: 'Practice 3: plug pairs and rings' }))).toContain('Rings: F U N');
  });

  it('shows practice 4, the naval M4, with the thin rotor first in its key (spec R5a 3)', () => {
    const onLoad = vi.fn();
    renderWithIntl(<MessageList onLoad={onLoad} />);
    const card = screen.getByRole('article', { name: 'Practice 4: the naval M4' });
    expect(facts(card)).toEqual(['Rotors: Gamma II IV VIII', 'Rings: A A A A', 'Plug pairs: AT BL EN GR', 'Reflector: Thin C', 'Start: U N A V']);
    expect(within(card).getByText('BVPNO JHKGP VCRSK EWZWT XWXQ')).toBeTruthy();
    const load = within(card).getByRole('button', { name: 'Load into the machine: Practice 4: the naval M4' });
    fireEvent.click(load);
    expect(onLoad).toHaveBeenCalledWith(
      { title: 'Practice 4: the naval M4', sheet: expect.objectContaining({ start: ['N', 'A', 'V'], answer: 'FOURXROTORSXFORXTHEXNAVY' }) },
      load,
    );
  });

  it('writes the practice messages in the visitor’s language', () => {
    renderWithIntl(<MessageList onLoad={() => {}} />, 'pt-BR');
    expect(within(screen.getByRole('article', { name: 'Practice 1: no plug pairs' })).getByText('TEZPI NYIAC MKGYS QQKPV S')).toBeTruthy();
  });

  it('hands the key sheet to the lab', () => {
    const onLoad = vi.fn();
    renderWithIntl(<MessageList onLoad={onLoad} />);
    const load = screen.getByRole('button', { name: 'Load into the machine: Practice 2: plug pairs' });
    fireEvent.click(load);
    expect(onLoad).toHaveBeenCalledWith(
      { title: 'Practice 2: plug pairs', sheet: expect.objectContaining({ start: ['D', 'O', 'G'], answer: 'TURINGXHELPEDXBREAKXENIGMA' }) },
      load,
    );
  });

  it('shows Barbarossa in 2 parts, each with its start and its own button', () => {
    const onLoad = vi.fn();
    renderWithIntl(<MessageList onLoad={onLoad} />);
    const card = screen.getByRole('article', { name: 'Operation Barbarossa, 1941' });
    expect(facts(card)).toEqual(['Rotors: II IV V', 'Rings: B U L', 'Plug pairs: AV BS CG DL FU HZ IN KM OW RX', 'Reflector: B']);
    expect(within(card).getByText('The operator sent the start hidden: from W X C, typing K C H lights B L A.')).toBeTruthy();
    expect(within(card).getByText('The first group, RFUGZ, only named the key. It is left out here.')).toBeTruthy();
    const loadPart2 = within(card).getByRole('button', { name: 'Load part 2: Operation Barbarossa, 1941' });
    fireEvent.click(loadPart2);
    expect(onLoad).toHaveBeenCalledWith({ title: 'Operation Barbarossa, 1941, part 2', sheet: expect.objectContaining({ start: ['L', 'S', 'D'] }) }, loadPart2);
  });

  it('shows what each real message says, in German and in the visitor’s language, and links its sources', () => {
    renderWithIntl(<MessageList onLoad={() => {}} />);
    const card = screen.getByRole('article', { name: 'The Scharnhorst’s last message, 1943' });
    expect(within(card).getByText('steuere j tanafjord j an standort qu aaa ccc vier neun neun zwo fahrt zwo nul sm xx scharnhorst hco')).toBeTruthy();
    expect(within(card).getByText('Steuere Tanafjord an. Standort Qu. AC 4992, Fahrt 20 sm. Scharnhorst').getAttribute('lang')).toBe('de');
    expect(within(card).getByText('Am steering for Tanafjord. Position: square AC 4992. Speed: 20 knots. Scharnhorst.')).toBeTruthy();
    expect(within(card).getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual([
      'https://cryptocellar.org/bgac/scharnhorst.html',
      'https://www.bytereef.org/m4-project-scharnhorst-break.html',
    ]);
  });

  it('says who broke each real message only as a linked source says it', () => {
    renderWithIntl(<MessageList onLoad={() => {}} />);
    // The Rijmenants manual: "a pre-release of ... an on-going codebreaking project to break a large number of original
    // German wartime messages. The project is a joint effort by Frode Weierud and Geoff Sullivan". It gives no year.
    const barbarossa = screen.getByRole('article', { name: 'Operation Barbarossa, 1941' });
    expect(
      within(barbarossa).getByText(
        'On 7 July 1941, a German division in Russia sent this report in 2 parts. Frode Weierud and Geoff Sullivan broke it, in their project to break German wartime messages.',
      ),
    ).toBeTruthy();
    expect(within(barbarossa).getByRole('link', { name: /Rijmenants/ }).getAttribute('href')).toBe('https://www.ciphermachinesandcryptology.com/files/Enigma%20Sim%20Manual.pdf');
    // Weierud's page: "Less than 24 hours later, on 28 May 2008 at 18:16:21, the message was broken" by the M4 Message Breaking Project.
    const scharnhorst = screen.getByRole('article', { name: 'The Scharnhorst’s last message, 1943' });
    expect(within(scharnhorst).getByText(/The M4 Project broke the message on 28 May 2008\.$/)).toBeTruthy();
    expect(within(scharnhorst).getByRole('link', { name: /Weierud/ }).getAttribute('href')).toBe('https://cryptocellar.org/bgac/scharnhorst.html');
  });
});
