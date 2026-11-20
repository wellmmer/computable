import { expect, test, type Page } from '@playwright/test';
import { openPage } from './helpers';

/**
 * The full search tests 60 rotor orders and takes several seconds, so most tests limit it to the
 * practice key's order with the test-only setting (spec R4 6). The page never shows it.
 */
async function searchOneOrder(page: Page) {
  await page.addInitScript(() => window.sessionStorage.setItem('computable.test.bombe-orders', 'II III V'));
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

  test('gives the hints for a crib under 10 letters without a loop', async ({ page }) => {
    await openBombe(page);
    await page.getByRole('button', { name: 'Load the practice message' }).click();
    await page.getByRole('textbox', { name: 'Crib: a word you know is in the message' }).fill('wetter');
    await expect(page.getByText('Tip: use a crib of 10 letters or more. A short crib gives many false stops.')).toBeVisible();
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
      const found = await page.getByRole('heading', { level: 2, name }).boundingBox();
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
    for (const name of ['Crib', /^Menu/, 'The Bombe', 'Stops']) tops.push((await box(name)).y);
    expect([...tops].sort((a, b) => a - b)).toEqual(tops);
  });
});

/** The practice message in each language: the texts the test clicks and reads. */
const PRACTICE = [
  { path: '/en', load: 'Load the practice message', start: 'Start', done: 'Finished: 1 rotor order tested. 1 stop.', tryIt: 'Try in the Enigma lab: II III V, Q K A', box: 'Decrypting: Bombe stop, rotors II III V, start Q K A' },
  { path: '/pt-br', load: 'Carregar a mensagem de treino', start: 'Iniciar', done: 'Concluído: 1 ordem de rotores testada. 1 parada.', tryIt: 'Testar no laboratório da Enigma: II III V, Q K A', box: 'Decifrando: Parada da Bombe, rotores II III V, início Q K A' },
  { path: '/es', load: 'Cargar el mensaje de práctica', start: 'Iniciar', done: 'Terminado: 1 orden de rotores probado. 1 parada.', tryIt: 'Probar en el laboratorio Enigma: II III V, Q K A', box: 'Descifrando: Parada de la Bombe, rotores II III V, inicio Q K A' },
  { path: '/fr', load: 'Charger le message d’entraînement', start: 'Démarrer', done: 'Terminé : 1 ordre des rotors testé. 1 arrêt.', tryIt: 'Essayer dans le labo Enigma: II III V, Q K A', box: 'Déchiffrement : Arrêt de la Bombe, rotors II III V, départ Q K A' },
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
