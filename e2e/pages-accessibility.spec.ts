import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { LOCALE_PATHS, openPage } from './helpers';

/** Every page, after the language prefix. */
const PATHS = ['', '/about', '/support', '/privacy', '/simulator', '/learn', '/learn/intuition', '/learn/formal-definition'];

async function axeViolations(page: Page) {
  return (await new AxeBuilder({ page }).analyze()).violations;
}

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`${colorScheme} mode`, () => {
    test.use({ colorScheme });

    // Every page in every language. The browser is English, so pages in other languages show the language bar.
    for (const locale of LOCALE_PATHS) {
      for (const path of PATHS) {
        test(`${locale}${path} has no axe violations`, async ({ page }) => {
          await openPage(page, `${locale}${path}`);
          if (path === '/simulator') await expect(page.locator('.react-flow__node').first()).toBeVisible();
          expect(await axeViolations(page)).toEqual([]);
        });
      }
    }

    test('the theme switch set by hand has no axe violations', async ({ page }) => {
      await openPage(page, '/en/privacy');
      await page.getByRole('banner').locator('button[aria-pressed]').click();
      expect(await axeViolations(page)).toEqual([]);
    });

    test('a lesson with a run machine and a finished quiz has no axe violations', async ({ page }) => {
      await openPage(page, '/en/learn/intuition');
      const machine = page.getByRole('figure', { name: 'Binary +1' });
      await machine.getByRole('button', { name: 'Run' }).click();
      await expect(machine.getByTestId('result-line')).toBeVisible({ timeout: 10_000 });
      // The first option of each question: some answers are right and some are wrong, so both marks show.
      for (let number = 1; number <= 5; number++) {
        const question = page.getByRole('group', { name: new RegExp(`^Question ${number} of 5`) });
        await question.getByRole('radio').first().check();
        await question.getByRole('button', { name: 'Check' }).click();
      }
      await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
      expect(await axeViolations(page)).toEqual([]);
    });

    test('lesson 2 with a run machine and a finished quiz has no axe violations', async ({ page }) => {
      await openPage(page, '/en/learn/formal-definition');
      const machine = page.getByRole('figure', { name: 'Palindrome checker' });
      await machine.getByRole('button', { name: 'Run' }).click();
      // 15 steps, one every 700 ms at the default speed: about 10 seconds.
      await expect(machine.getByTestId('result-line')).toBeVisible({ timeout: 20_000 });
      // The first option of each question: some answers are right and some are wrong, so both marks show.
      for (let number = 1; number <= 5; number++) {
        const question = page.getByRole('group', { name: new RegExp(`^Question ${number} of 5`) });
        await question.getByRole('radio').first().check();
        await question.getByRole('button', { name: 'Check' }).click();
      }
      await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
      expect(await axeViolations(page)).toEqual([]);
    });

    test("the Learn page's reset question has no axe violations", async ({ page }) => {
      await openPage(page, '/en/learn');
      await page.getByRole('button', { name: 'Reset my progress' }).click();
      await expect(page.getByRole('button', { name: 'Yes, clear them' })).toBeVisible();
      expect(await axeViolations(page)).toEqual([]);
    });

    test('the open language switcher has no axe violations', async ({ page }) => {
      await openPage(page, '/de/about');
      await page.getByRole('button', { name: 'Sprache: Deutsch' }).click();
      await expect(page.getByRole('link', { name: 'Português' })).toBeVisible();
      expect(await axeViolations(page)).toEqual([]);
    });

    test('the tour has no axe violations on any of its 7 steps', async ({ page }) => {
      await openPage(page, '/en/simulator');
      await expect(page.locator('.react-flow__node').first()).toBeVisible();
      await page.getByRole('button', { name: 'Take the tour' }).click();
      const panel = page.getByRole('dialog', { name: 'Tour of the simulator' });
      for (let step = 1; step <= 7; step++) {
        await expect(panel.getByText(`Step ${step} of 7`)).toBeVisible();
        expect(await axeViolations(page), `step ${step}`).toEqual([]);
        await panel.getByRole('button', { name: step === 7 ? 'Finish' : 'Next' }).click();
      }
    });
  });
}
