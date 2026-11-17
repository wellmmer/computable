import { expect, test, type Page } from '@playwright/test';
import { openPage } from './helpers';

/** The reading guide in each language (spec R2c 3): its title, the label of a translated quote, and the step counter at the start. */
const LANGUAGES = [
  { path: '/en', title: 'Turing’s 1936 paper', translation: null, start: 'Step 0' },
  { path: '/pt-br', title: 'O artigo de Turing de 1936', translation: 'Tradução:', start: 'Passo 0' },
  { path: '/es', title: 'El artículo de Turing de 1936', translation: 'Traducción:', start: 'Paso 0' },
  { path: '/fr', title: 'L’article de Turing de 1936', translation: 'Traduction :', start: 'Étape 0' },
  { path: '/de', title: 'Turings Arbeit von 1936', translation: 'Übersetzung:', start: 'Schritt 0' },
] as const;

const tape = (page: Page) => page.getByTestId('paper-tape');

/** Scrolls so that the top of part `index` (0 for section 1) sits at `share` of the window's height. */
async function scrollPartTo(page: Page, index: number, share: number) {
  await page.evaluate(
    ([at, where]) => {
      const part = document.querySelectorAll('[data-paper-part]')[at];
      window.scrollTo(0, part.getBoundingClientRect().top + window.scrollY - window.innerHeight * where);
    },
    [index, share],
  );
}

for (const { path, title, translation, start } of LANGUAGES) {
  test(`${path}/learn/paper shows the 13 parts, the DOI link and the quotes in English`, async ({ page }) => {
    await openPage(page, `${path}/learn/paper`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
    await expect(page.locator('[data-paper-part]')).toHaveCount(13);
    await expect(page.locator('main a[href="https://doi.org/10.1112/plms/s2-42.1.230"]')).toHaveCount(1);
    await expect(page.locator('blockquote[lang="en"]')).toHaveCount(12);
    await expect(page.locator('blockquote').first()).toHaveText(
      '“The machine is supplied with a ‘tape’ (the analogue of paper) running through it, and divided into sections (called ‘squares’) each capable of bearing a ‘symbol’.”',
    );
    if (translation !== null) await expect(page.getByText(translation, { exact: false })).toHaveCount(12);
    await expect(tape(page).getByText(start)).toBeVisible();
  });
}

test('scrolling moves the tape one step per part reached, and back on the way up', async ({ page }) => {
  await openPage(page, '/en/learn/paper');
  await expect(tape(page).getByText('Step 0')).toBeVisible();
  // Parts 1 to 3 have passed the middle of the window: three steps, so the head is in 𝔨 on cell 3.
  await scrollPartTo(page, 2, 0.3);
  await expect(tape(page).getByText('Step 3')).toBeVisible();
  await expect(tape(page).getByTestId('head-state')).toHaveText('𝔨');
  // The tape stays at the top of the window while the parts scroll by.
  expect((await tape(page).boundingBox())?.y).toBe(0);
  await scrollPartTo(page, 12, 0.3);
  await expect(tape(page).getByText('Step 13')).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(tape(page).getByText('Step 0')).toBeVisible();
  await expect(tape(page).getByRole('button')).toHaveCount(0);
});

test.describe('with reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('the tape shows Step and Reset, and scrolling does not move it', async ({ page }) => {
    await openPage(page, '/en/learn/paper');
    await expect(tape(page).getByRole('button', { name: 'Step' })).toBeVisible();
    await scrollPartTo(page, 4, 0.3);
    await expect(tape(page).getByText('Step 0')).toBeVisible();
    await tape(page).getByRole('button', { name: 'Step' }).click();
    await tape(page).getByRole('button', { name: 'Step' }).click();
    await expect(tape(page).getByText('Step 2')).toBeVisible();
    await expect(page.getByRole('status').filter({ hasText: 'In 𝔠' })).toHaveText('In 𝔠 reading _: move right, go to 𝔢.');
    await tape(page).getByRole('button', { name: 'Reset' }).click();
    await expect(tape(page).getByText('Step 0')).toBeVisible();
  });
});

test('on a 390 px phone the tape takes less than a third of the screen and ends above the reading line, in every language', async ({ browser }) => {
  for (const reducedMotion of ['no-preference', 'reduce'] as const) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion });
    const page = await context.newPage();
    for (const { path } of LANGUAGES) {
      await openPage(page, `${path}/learn/paper`);
      await scrollPartTo(page, 3, 0.5);
      const box = await tape(page).boundingBox();
      expect(box, `${path} ${reducedMotion}`).not.toBeNull();
      // 4 px of padding, the 170 px tape, the 48 px row and the borders: the same height with or without the buttons.
      expect(box?.height, `${path} ${reducedMotion}`).toBe(226);
      expect((box?.y ?? 0) + (box?.height ?? 0), `${path} ${reducedMotion}`).toBeLessThan(844 * 0.5);
      // The heading of the part being read sits below the tape, not under it.
      const heading = await page.locator('[data-paper-part]').nth(3).getByRole('heading', { level: 2 }).boundingBox();
      expect(heading?.y ?? 0, `${path} ${reducedMotion}`).toBeGreaterThan((box?.y ?? 0) + (box?.height ?? 0));
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), path).toBe(0);
    }
    await context.close();
  }
});

test('the page does not shift while it loads, hydrates and scrolls (CLS under 0.05)', async ({ browser }) => {
  for (const reducedMotion of ['no-preference', 'reduce'] as const) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion });
    const page = await context.newPage();
    await page.addInitScript(() => {
      const shifts = { total: 0 };
      Object.assign(window, { layoutShifts: shifts });
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const shift = entry as PerformanceEntry & { value: number; hadRecentInput: boolean };
          if (!shift.hadRecentInput) shifts.total += shift.value;
        }
      }).observe({ type: 'layout-shift', buffered: true });
    });
    await openPage(page, '/pt-br/learn/paper');
    for (let index = 0; index < 13; index += 3) await scrollPartTo(page, index, 0.3);
    await page.waitForTimeout(500);
    const total = await page.evaluate(() => (window as unknown as { layoutShifts: { total: number } }).layoutShifts.total);
    expect(total, reducedMotion).toBeLessThan(0.05);
    await context.close();
  }
});
