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

  test('keeps a typed secret after a reload, and forgets it', async ({ page }) => {
    await openPage(page, '/en');
    await textBox(page).fill('Wetterbericht');
    await expect(secretLetters(page)).toHaveText('PBJGO LIZQM QGZ');
    await openPage(page, '/en');
    await expect(textBox(page)).toHaveValue('Wetterbericht');
    await page.getByRole('button', { name: 'Forget my secret' }).click();
    await expect(textBox(page)).toHaveValue('');
    expect(await page.evaluate(() => localStorage.getItem('computable.secret'))).toBeNull();
  });

  test('the Enigma lab decrypts the secret letters from Home', async ({ page }) => {
    await openPage(page, '/en');
    await textBox(page).fill('Hello, Turing!');
    await expect(secretLetters(page)).not.toBeEmpty();
    const secret = (await secretLetters(page).textContent()) ?? '';
    await page.getByRole('link', { name: 'Open the Enigma lab' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Enigma I');
    await page.keyboard.type(secret.replaceAll(' ', ''));
    await expect(page.getByRole('region', { name: 'Lamps lit' }).locator('[data-strip]')).toHaveText('HELLO XTURI NG');
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
