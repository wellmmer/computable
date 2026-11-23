import { expect, test, type Page } from '@playwright/test';
import { openPage, openSimulator, pickExample } from './helpers';

/** The symbol in a tape cell. */
const cell = (page: Page, index: number) => page.locator(`[data-cell="${index}"] [data-testid="cell-symbol"]`);

test.describe('Home (spec 4.2)', () => {
  test("runs Turing's first machine until the visitor presses Pause", async ({ page }) => {
    await openPage(page, '/en');
    // Speed 3 makes one step every 700 ms: after 4 steps, cells 0 and 2 hold 0 and 1.
    await expect(cell(page, 0)).toHaveText('0');
    await expect(cell(page, 2)).toHaveText('1', { timeout: 5_000 });
    await page.getByRole('button', { name: 'Pause' }).click();
    const state = await page.getByTestId('head-state').textContent();
    await page.waitForTimeout(1_500);
    await expect(page.getByTestId('head-state')).toHaveText(state ?? '');
    await expect(page.getByRole('button', { name: 'Play' })).toBeVisible();
  });

  test('with reduced motion, shows the machine after 11 steps and keeps it still', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openPage(page, '/en');
    await expect(page.getByText('Head on cell 11, in state 𝔨, reading _.')).toBeAttached();
    await page.waitForTimeout(1_500);
    await expect(page.getByText('Head on cell 11, in state 𝔨, reading _.')).toBeAttached();
    const printed = await Promise.all([0, 2, 4, 6, 8, 10].map((index) => cell(page, index).textContent()));
    expect(printed).toEqual(['0', '1', '0', '1', '0', '1']);
  });

  test('"Open the simulator" opens the machine the visitor saved, not the one on Home', async ({ page }) => {
    await openSimulator(page);
    await pickExample(page, 'Palindrome checker');
    await page.getByRole('link', { name: 'Computable', exact: true }).click();
    await page.getByRole('link', { name: 'Open the simulator' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Palindrome checker');
  });
});

test.describe('Home: "Type your own secret" (spec R3 4)', () => {
  const textBox = (page: Page) => page.getByRole('textbox', { name: 'Your message' });
  const secretLetters = (page: Page) => page.getByText('Secret letters', { exact: true }).locator('xpath=following-sibling::dd');

  test('keeps a typed secret and its key after a reload, and forgets it', async ({ page }) => {
    await openPage(page, '/en');
    await textBox(page).fill('Wetterbericht');
    await expect(secretLetters(page)).toHaveText(/^[A-Z]{5} [A-Z]{5} [A-Z]{3}$/);
    const letters = await secretLetters(page).textContent();
    await openPage(page, '/en');
    await expect(textBox(page)).toHaveValue('Wetterbericht');
    await expect(secretLetters(page)).toHaveText(letters ?? '');
    await page.getByRole('button', { name: 'Forget my secret' }).click();
    await expect(textBox(page)).toHaveValue('');
    expect(await page.evaluate(() => localStorage.getItem('computable.secret'))).toBeNull();
  });

  test('"Load my secret into the lab" opens the secret in the Enigma lab, and the answer checks (spec R4 4)', async ({ page }) => {
    await openPage(page, '/en');
    await textBox(page).fill('Hello, Turing!');
    await page.getByRole('link', { name: 'Load my secret into the lab' }).click();
    const box = page.getByRole('region', { name: 'Decrypting: Your secret from Home' });
    await expect(box.getByRole('heading')).toBeFocused();
    await expect(page).toHaveURL(/\/en\/enigma$/);
    await box.getByRole('button', { name: 'Type it for me' }).click();
    await expect(page.getByRole('region', { name: 'Lamps lit' }).locator('[data-strip]')).toHaveText('HELLO XTURI NG');
    await box.getByRole('button', { name: 'Check my answer' }).click();
    await expect(box.getByText('Right! The message says: HELLO TURING')).toBeVisible();
  });

  test('"Break it with the Bombe" fills the secret letters on the Bombe, with an empty crib (spec R4 4)', async ({ page }) => {
    await openPage(page, '/en');
    await textBox(page).fill('Wetterbericht Nordsee');
    await expect(secretLetters(page)).not.toBeEmpty();
    const letters = await secretLetters(page).textContent();
    await page.getByRole('link', { name: 'Break it with the Bombe' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Bombe');
    await expect(page.getByRole('textbox', { name: 'Secret letters' })).toHaveValue(letters ?? '?');
    await expect(page.getByRole('textbox', { name: 'Crib: a word you know is in the message' })).toHaveValue('');
    await expect(page).toHaveURL(/\/en\/bombe$/);
  });

  test('never erases text typed while the page is still loading', async ({ page }) => {
    // Hold back the page's scripts, not its styles, so React hydrates only after the visitor typed.
    let releaseScripts = () => {};
    const scriptsHeld = new Promise<void>((resolve) => (releaseScripts = resolve));
    await page.route(/\/_next\/static\/chunks\/.*\.js$/, async (route) => {
      await scriptsHeld;
      await route.continue();
    });
    await page.goto('/en', { waitUntil: 'commit' });
    await textBox(page).pressSequentially('Hallo', { timeout: 10_000 });
    const typedEarly = await textBox(page).inputValue();
    releaseScripts();
    await expect(page.getByRole('banner').locator('button[aria-pressed]')).toHaveAttribute('aria-pressed', /^(true|false)$/);
    await expect(textBox(page)).toHaveValue(typedEarly);
    // Once the page has loaded, the field takes the text and keeps it.
    await textBox(page).pressSequentially('Welt');
    await expect(textBox(page)).toHaveValue(`${typedEarly}Welt`);
    await openPage(page, '/en');
    await expect(textBox(page)).toHaveValue(`${typedEarly}Welt`);
  });

  test('shows the secret first, then the two buttons, then Turing’s tape', async ({ page }) => {
    await openPage(page, '/en');
    const tops = await Promise.all(
      [textBox(page), page.getByRole('link', { name: 'Open the Enigma lab' }), page.getByRole('link', { name: 'Open the simulator' }), page.getByTestId('tape-strip')].map(
        async (locator) => (await locator.boundingBox())?.y ?? -1,
      ),
    );
    expect(tops[0]).toBeLessThan(tops[1]);
    expect(tops[1]).toBeLessThanOrEqual(tops[2]);
    expect(tops[2]).toBeLessThan(tops[3]);
  });
});

test.describe('Support the dev (spec 7)', () => {
  test('says the links are not ready while every handle is empty, with no amount and no payment link', async ({ page }) => {
    await openPage(page, '/en/support');
    const main = page.getByRole('main');
    await expect(main.getByText('The payment links are not ready yet. Thank you for wanting to help.')).toBeVisible();
    await expect(main.getByRole('radio')).toHaveCount(0);
    await expect(main.getByRole('link')).toHaveCount(0);
  });
});
