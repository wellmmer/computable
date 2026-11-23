import { expect, test, type Page } from '@playwright/test';
import { openPage } from './helpers';

/**
 * The full search tests 60 rotor orders and takes several seconds, so most tests limit it to the
 * practice key's order, or Barbarossa's, with the test-only setting (spec R4 6). The page never shows it.
 */
async function searchOneOrder(page: Page, order = 'II III V') {
  await page.addInitScript((setting) => window.sessionStorage.setItem('computable.test.bombe-orders', setting), order);
}

/** Opens the Bombe lab and waits until React has hydrated it: its buttons work only then. */
export async function openBombe(page: Page, path = '/en/bombe') {
  await openPage(page, path);
  await expect(page.locator('[data-bombe="ready"]')).toBeAttached();
}

/** The letters on the drum wall, Enigma by Enigma. */
const drums = (page: Page) => page.locator('[data-enigma]').allTextContents();

test.describe('the Bombe lab (spec R4 3)', () => {
  test('breaks the practice message, and opens the stop in the Enigma lab', async ({ page }) => {
    await searchOneOrder(page);
    await openBombe(page);
    await page.getByRole('button', { name: 'Load the practice message' }).click();
    await expect(page.getByRole('heading', { name: 'Menu: 3 loops' })).toBeVisible();
    await page.getByRole('button', { name: 'Start' }).click();
    await expect(page.getByRole('status')).toHaveText('Finished: 1 rotor order tested. 1 stop.');
    await expect(page.getByText('II III V · start Q K A')).toBeVisible();
    await expect(page.getByText('Plug pairs found: AH BP EX KW MR NT VZ')).toBeVisible();

    await page.getByRole('link', { name: 'Try in the Enigma lab: II III V, Q K A' }).click();
    const box = page.getByRole('region', { name: 'Decrypting: Bombe stop, rotors II III V, start Q K A' });
    await expect(box.getByRole('heading')).toBeFocused();
    await expect(page).toHaveURL(/\/en\/enigma$/);
    await expect(box.getByRole('button', { name: 'Check my answer' })).toHaveCount(0);
    await box.getByRole('button', { name: 'Type it for me' }).click();
    await expect(page.getByRole('region', { name: 'Lamps lit' }).locator('[data-strip]')).toHaveText(/^WETTE RBERI CHT/);
  });

  test('breaks Barbarossa part 1, says why the start is not B L A, and reads blocks of it in the Enigma lab (spec R4 5)', async ({ page }) => {
    await searchOneOrder(page, 'II IV V');
    await openBombe(page);
    await page.getByRole('button', { name: 'Break part 1 with the Bombe' }).click();
    await expect(page.getByRole('textbox', { name: 'Crib: a word you know is in the message' })).toHaveValue('OWAXNORDWESTLXSE');
    await expect(page.getByText('Place 37 of 159')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Menu: 1 loop' })).toBeVisible();
    await expect(page.getByText(/^The real key used rings B U L and start B L A\. The Bombe assumes rings A A A, so it finds start A Q P instead\./)).toBeVisible();
    await page.getByRole('button', { name: 'Start' }).click();
    await expect(page.getByRole('status')).toHaveText('Finished: 1 rotor order tested. 1 stop.');
    await expect(page.getByText('II IV V · start A Q P')).toBeVisible();
    await expect(page.getByText('Plug pairs found: AV BS CG DL FU HZ IN OW RX')).toBeVisible();

    await page.getByRole('link', { name: 'Try in the Enigma lab: II IV V, A Q P' }).click();
    const box = page.getByRole('region', { name: 'Decrypting: Bombe stop, rotors II IV V, start A Q P' });
    await expect(box.getByRole('heading')).toBeFocused();
    await box.getByRole('button', { name: 'Type it for me' }).click();
    // Letters 10 to 22 read "EILUNG X VON X KU". Letters 1 to 9 do not: there the middle rotor stands one letter off.
    await expect(page.getByRole('region', { name: 'Lamps lit' }).locator('[data-strip]')).toHaveText(/^SFBEA XFUME ILUNG XVONX KU/);
  });

  test('has the history under the lab: 5 facts and the film box, each with its sources (spec R4 5)', async ({ page }) => {
    await openBombe(page);
    const history = page.getByRole('region', { name: 'How the Bombe came to be' });
    await expect(history.getByRole('heading', { level: 3 })).toHaveText([
      '1938: the Polish bomba',
      'July 1939: the meeting at Pyry',
      '1939: Turing’s Bombe',
      'March 1940: Victory',
      'August 1940: Welchman’s diagonal board',
      'On film',
    ]);
    await expect(history.getByRole('link')).toHaveCount(12);
    await expect(history.getByText('The Imitation Game (2014), a drama with Benedict Cumberbatch as Alan Turing.')).toBeVisible();
    await expect(history.locator('img, picture, video')).toHaveCount(0);
  });

  test('shows a crash in red, and Start waits for a place without one', async ({ page }) => {
    await openBombe(page);
    await page.getByRole('button', { name: 'Load the practice message' }).click();
    await expect(page.getByText('No letter turns into itself here.')).toBeVisible();
    await page.getByRole('button', { name: 'Slide the crib right' }).click();
    await expect(page.getByText('Place 2 of 72')).toBeVisible();
    await expect(page.getByText('✗ 1 letter would turn into itself (red). Enigma never does that, so the crib cannot sit here.')).toBeVisible();
    await expect(page.locator('[data-crash]')).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Start' })).toBeDisabled();
    await expect(page.getByText('Slide the crib to a place without red letters to start.')).toBeVisible();
    await page.getByRole('button', { name: 'Slide the crib left' }).click();
    await expect(page.getByRole('button', { name: 'Start' })).toBeEnabled();
  });

  test('gives the hints for a crib under 15 letters without a loop', async ({ page }) => {
    await openBombe(page);
    await page.getByRole('button', { name: 'Load the practice message' }).click();
    await page.getByRole('textbox', { name: 'Crib: a word you know is in the message' }).fill('wetter');
    await expect(page.getByText('Tip: use a crib of 15 letters or more. A short crib gives many false stops.')).toBeVisible();
    await expect(page.getByText('Tip: this menu has no loop. Slide the crib or make it longer to get fewer false stops.')).toBeVisible();
  });

  test('runs the full search in a worker, and stops when asked', async ({ page }) => {
    await openBombe(page);
    await page.getByRole('button', { name: 'Load the practice message' }).click();
    await page.getByRole('button', { name: 'Start' }).click();
    await expect(page.getByText(/^Rotor order [2-9] of 60$/)).toBeVisible();
    await page.getByRole('button', { name: 'Stop' }).click();
    await expect(page.getByRole('status')).toHaveText(/^Stopped after \d+ of 60 rotor orders\.$/);
    await expect(page.getByRole('button', { name: 'Start' })).toBeEnabled();
  });

  test('turns the drums during the search, and keeps them still with reduced motion', async ({ browser }) => {
    for (const reducedMotion of ['no-preference', 'reduce'] as const) {
      const context = await browser.newContext({ reducedMotion });
      const page = await context.newPage();
      await searchOneOrder(page);
      await openBombe(page);
      await page.getByRole('button', { name: 'Load the practice message' }).click();
      const before = await drums(page);
      expect(before).toHaveLength(12);
      await page.getByRole('button', { name: 'Start' }).click();
      await expect(page.getByRole('status')).toHaveText('Finished: 1 rotor order tested. 1 stop.');
      if (reducedMotion === 'reduce') expect(await drums(page), reducedMotion).toEqual(before);
      else expect(await drums(page), reducedMotion).not.toEqual(before);
      await context.close();
    }
  });

  test('puts the drum wall left of the cards on a desktop, and below the menu on a phone', async ({ page }) => {
    const box = async (name: string | RegExp) => {
      const found = await page.getByRole('heading', { level: 2, name, exact: true }).boundingBox();
      if (found === null) throw new Error(`no heading ${name}`);
      return found;
    };
    await page.setViewportSize({ width: 1280, height: 900 });
    await openBombe(page);
    const [wall, crib] = [await box('The Bombe'), await box('Crib')];
    expect(wall.x).toBeLessThan(crib.x);
    expect(Math.abs(wall.y - crib.y)).toBeLessThan(40);

    await page.setViewportSize({ width: 390, height: 844 });
    const tops = [];
    for (const name of ['Crib', /^Menu/, 'The Bombe', 'One test, step by step', 'Stops']) tops.push((await box(name)).y);
    expect([...tops].sort((a, b) => a - b)).toEqual(tops);
  });
});

/**
 * Home's secret with the practice key, as Home saves it in the browser. Home draws a random key, and
 * the search of 1 rotor order finds only a key with that order, so the test saves a known key.
 */
async function savePracticeSecret(page: Page) {
  await page.addInitScript(() =>
    window.localStorage.setItem(
      'computable.secret',
      JSON.stringify({
        plain: 'Wetterbericht Nordsee',
        cipher: 'HXHICIRWHZRQWGLYJJPQQ',
        settings: { rotors: ['II', 'III', 'V'], rings: ['A', 'A', 'A'], reflector: 'B', plugs: ['AH', 'BP', 'DF', 'EX', 'KW', 'MR', 'NT', 'OY', 'SU', 'VZ'] },
        start: ['Q', 'K', 'A'],
      }),
    ),
  );
}

test.describe('your own secret on the Bombe (spec R4 4)', () => {
  test('"#my-secret" fills the secret letters, and the stop with the saved key says "This is your key"', async ({ page }) => {
    await searchOneOrder(page);
    await savePracticeSecret(page);
    await openBombe(page, '/en/bombe#my-secret');
    await expect(page.getByRole('textbox', { name: 'Secret letters' })).toHaveValue('HXHIC IRWHZ RQWGL YJJPQ Q');
    await expect(page).toHaveURL(/\/en\/bombe$/);
    await page.getByRole('textbox', { name: 'Crib: a word you know is in the message' }).fill('WETTERBERICHT');
    await page.getByRole('button', { name: 'Start' }).click();
    await expect(page.getByRole('status')).toHaveText('Finished: 1 rotor order tested. 1 stop.');
    await expect(page.getByRole('listitem').filter({ hasText: 'II III V · start Q K A' })).toContainText('✓ This is your key');
  });
});

test.describe('slow step mode (spec R4 4)', () => {
  test('watches the first stop step by step: Step, Back, then Play to the stop', async ({ page }) => {
    await searchOneOrder(page);
    await openBombe(page);
    await page.getByRole('button', { name: 'Load the practice message' }).click();
    await page.getByRole('button', { name: 'Start' }).click();
    await expect(page.getByRole('status')).toHaveText('Finished: 1 rotor order tested. 1 stop.');
    await page.getByRole('button', { name: 'Watch one test slowly' }).click();
    const card = page.getByRole('region', { name: 'One test, step by step' });
    const sentence = card.getByTestId('slow-sentence');
    await expect(card.getByText('Rotors II III V, start Q K A')).toBeVisible();
    await expect(card.getByText('Step 1 of 18')).toBeVisible();
    await expect(sentence).toHaveText('The test current enters H on wire A. This is the guess “H is plugged to A”.');
    await expect(card.getByRole('button', { name: 'Step' })).toBeFocused();

    await card.getByRole('button', { name: 'Step' }).click();
    await expect(sentence).toHaveText('The diagonal board adds the mirror wire: A on wire H.');
    await card.getByRole('button', { name: 'Step' }).click();
    await expect(sentence).toHaveText(/^Through link \d+ /);
    await expect(page.locator('path[data-active]')).toHaveCount(1);
    await card.getByRole('button', { name: 'Back' }).click();
    await expect(card.getByText('Step 2 of 18')).toBeVisible();
    await expect(page.locator('path[data-active]')).toHaveCount(0);

    await card.getByRole('button', { name: 'Play' }).click();
    await expect(card.getByText('Step 18 of 18')).toBeVisible({ timeout: 15_000 });
    await expect(sentence).toHaveText(/^Stop: only \d+ of 26 wires of H lit\.$/);
    await card.getByRole('button', { name: 'Close' }).click();
    await expect(page.getByRole('button', { name: 'Watch one test slowly' })).toBeFocused();
  });

  test('with reduced motion, Play still steps, and the drum wall shows the test', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    await searchOneOrder(page);
    await openBombe(page);
    await page.getByRole('button', { name: 'Load the practice message' }).click();
    await page.getByRole('button', { name: 'Start' }).click();
    await expect(page.getByRole('status')).toHaveText('Finished: 1 rotor order tested. 1 stop.');
    // With reduced motion, the drums stayed at A A A during the search.
    expect((await drums(page))[0]).toBe('AAB');
    await page.getByRole('button', { name: 'Watch one test slowly' }).click();
    expect((await drums(page))[0]).toBe('QKB');
    const card = page.getByRole('region', { name: 'One test, step by step' });
    await card.getByRole('button', { name: 'Play' }).click();
    await expect(card.getByText('Step 18 of 18')).toBeVisible({ timeout: 15_000 });
    await context.close();
  });
});

/** The practice message in each language: the texts the test clicks and reads. */
const PRACTICE = [
  { path: '/en', load: 'Load the practice message', start: 'Start', done: 'Finished: 1 rotor order tested. 1 stop.', tryIt: 'Try in the Enigma lab: II III V, Q K A', box: 'Decrypting: Bombe stop, rotors II III V, start Q K A' },
  { path: '/pt-br', load: 'Carregar a mensagem de treino', start: 'Iniciar', done: 'Concluído: 1 ordem de rotores testada. 1 parada.', tryIt: 'Testar no laboratório da Enigma: II III V, Q K A', box: 'Decifrando: Parada da Bombe, rotores II III V, início Q K A' },
  { path: '/es', load: 'Cargar el mensaje de práctica', start: 'Iniciar', done: 'Terminado: 1 orden de rotores probado. 1 parada.', tryIt: 'Probar en el laboratorio Enigma: II III V, Q K A', box: 'Descifrando: Parada de la Bombe, rotores II III V, inicio Q K A' },
  { path: '/fr', load: 'Charger le message d’entraînement', start: 'Démarrer', done: 'Terminé : 1 ordre des rotors testé. 1 arrêt.', tryIt: 'Essayer dans le labo Enigma : II III V, Q K A', box: 'Déchiffrement : Arrêt de la Bombe, rotors II III V, départ Q K A' },
  { path: '/de', load: 'Übungsnachricht laden', start: 'Start', done: 'Fertig: 1 Walzenlage getestet. 1 Stopp.', tryIt: 'Im Enigma-Labor ausprobieren: II III V, Q K A', box: 'Entschlüsseln: Bombe-Stopp, Walzen II III V, Start Q K A' },
] as const;

for (const { path, load, start, done, tryIt, box } of PRACTICE) {
  test(`${path}/bombe breaks the practice message in its own language`, async ({ page }) => {
    await searchOneOrder(page);
    await openBombe(page, `${path}/bombe`);
    await page.getByRole('button', { name: load }).click();
    await page.getByRole('button', { name: start, exact: true }).click();
    await expect(page.getByRole('status')).toHaveText(done);
    await page.getByRole('link', { name: tryIt }).click();
    await expect(page.getByRole('heading', { name: box })).toBeFocused();
  });
}
