import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import de from '../messages/de.json';
import en from '../messages/en.json';
import es from '../messages/es.json';
import fr from '../messages/fr.json';
import ptBR from '../messages/pt-BR.json';
import { LOCALE_PATHS, openLab, openPage } from './helpers';

/** The page texts of each language, by its URL prefix. The tests pick buttons by these names. */
const MESSAGES = { '/en': en, '/pt-br': ptBR, '/es': es, '/fr': fr, '/de': de } as const;

/** Every page, after the language prefix. */
const PATHS = [
  '',
  '/about',
  '/support',
  '/privacy',
  '/simulator',
  '/learn',
  '/learn/intuition',
  '/learn/formal-definition',
  '/learn/universal-machine',
  '/learn/halting-problem',
  '/learn/entscheidungsproblem',
  '/learn/church-turing',
  '/learn/paper',
  '/enigma',
  '/bombe',
];

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

    test('lesson 3 with a marked row of the encoding has no axe violations', async ({ page }) => {
      await openPage(page, '/en/learn/universal-machine');
      const encoding = page.getByRole('figure', { name: 'Turing’s first machine, written as a description' });
      await encoding.getByRole('row').nth(2).focus();
      await expect(encoding.locator('mark')).toHaveCount(2);
      expect(await axeViolations(page)).toEqual([]);
    });

    test('lesson 4 with a stopped machine, a paused machine and a finished quiz has no axe violations', async ({ page }) => {
      await openPage(page, '/en/learn/halting-problem');
      const stops = page.getByRole('figure', { name: 'Binary +1' });
      await stops.getByRole('button', { name: 'Run' }).click();
      await expect(stops.getByTestId('result-line')).toBeVisible({ timeout: 10_000 });
      const forever = page.getByRole('figure', { name: 'Turing 1936: 0 1 0 1…' });
      await forever.getByRole('button', { name: 'Step' }).click();
      await forever.getByRole('button', { name: 'Step' }).click();
      // The first option of each question: some answers are right and some are wrong, so both marks show.
      for (let number = 1; number <= 5; number++) {
        const question = page.getByRole('group', { name: new RegExp(`^Question ${number} of 5`) });
        await question.getByRole('radio').first().check();
        await question.getByRole('button', { name: 'Check' }).click();
      }
      await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
      expect(await axeViolations(page)).toEqual([]);
    });

    test('lessons 5 and 6 with a finished quiz have no axe violations', async ({ page }) => {
      for (const slug of ['entscheidungsproblem', 'church-turing']) {
        await openPage(page, `/en/learn/${slug}`);
        // The first option of each question: some answers are right and some are wrong, so both marks show.
        for (let number = 1; number <= 5; number++) {
          const question = page.getByRole('group', { name: new RegExp(`^Question ${number} of 5`) });
          await question.getByRole('radio').first().check();
          await question.getByRole('button', { name: 'Check' }).click();
        }
        await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
        expect(await axeViolations(page), slug).toEqual([]);
      }
    });

    test('the reading guide with a moved tape has no axe violations, with and without reduced motion', async ({ browser }) => {
      for (const reducedMotion of ['no-preference', 'reduce'] as const) {
        const context = await browser.newContext({ colorScheme, reducedMotion });
        const page = await context.newPage();
        await openPage(page, '/en/learn/paper');
        const tape = page.getByTestId('paper-tape');
        if (reducedMotion === 'reduce') await tape.getByRole('button', { name: 'Step' }).click();
        else await page.evaluate(() => document.querySelectorAll('[data-paper-part]')[1].scrollIntoView());
        await expect(tape.getByText('Step 0')).toHaveCount(0);
        expect(await axeViolations(page), reducedMotion).toEqual([]);
        await context.close();
      }
    });

    // After typing, the lamps, the strips and the path show; then the settings dialog opens.
    for (const locale of LOCALE_PATHS) {
      test(`${locale}/enigma with typed letters, the path and the settings dialog has no axe violations, on a desktop and a phone`, async ({ page }) => {
        for (const viewport of [
          { width: 1280, height: 800 },
          { width: 390, height: 844 },
        ]) {
          await page.setViewportSize(viewport);
          await openLab(page, `${locale}/enigma`);
          await page.keyboard.type('WETTERBERICHT');
          await expect(page.getByRole('status')).not.toBeEmpty();
          expect(await axeViolations(page), `${viewport.width} px`).toEqual([]);
          // The first region of the page is the settings line, with its one button: "Change settings".
          await page.getByRole('main').getByRole('region').first().getByRole('button').click();
          await expect(page.getByRole('dialog')).toBeVisible();
          expect(await axeViolations(page), `${viewport.width} px, dialog`).toEqual([]);
        }
      });
    }

    // The Bombe lab after a search: the stops list with "This is your key", slow step mode, a crash in red and the hints, then Barbarossa part 1.
    for (const locale of LOCALE_PATHS) {
      test(`${locale}/bombe with a finished search, your key, slow step mode, a crash, the hints and Barbarossa has no axe violations, on a desktop and a phone`, async ({ page }) => {
        await page.addInitScript(() => window.sessionStorage.setItem('computable.test.bombe-orders', 'II III V'));
        // Home's secret with the practice key, so the stop says "This is your key".
        await page.addInitScript(() =>
          window.localStorage.setItem(
            'computable.secret',
            JSON.stringify({
              plain: 'Wetterbericht',
              cipher: 'HXHICIRWHZRQW',
              settings: { rotors: ['II', 'III', 'V'], rings: ['A', 'A', 'A'], reflector: 'B', plugs: ['AH', 'BP', 'DF', 'EX', 'KW', 'MR', 'NT', 'OY', 'SU', 'VZ'] },
              start: ['Q', 'K', 'A'],
            }),
          ),
        );
        for (const viewport of [
          { width: 1280, height: 800 },
          { width: 390, height: 844 },
        ]) {
          await page.setViewportSize(viewport);
          await openPage(page, `${locale}/bombe`);
          await expect(page.locator('[data-bombe="ready"]')).toBeAttached();
          const regions = page.getByRole('main').getByRole('region');
          const crib = regions.first();
          const texts = MESSAGES[locale].bombe;
          await crib.getByRole('button', { name: texts.crib.practice }).click();
          await regions.nth(2).getByRole('button', { name: texts.wall.start, exact: true }).click();
          // The regions: crib, menu, wall, slow step mode, stops.
          await expect(regions.nth(4).getByRole('link')).toHaveCount(1);
          await expect(regions.nth(4).getByRole('listitem')).toContainText('✓');
          expect(await axeViolations(page), `${viewport.width} px, stops`).toEqual([]);
          // Slow step mode: "Watch one test slowly", then Step twice to reach a link.
          await regions.nth(3).getByRole('button', { name: texts.slow.watch }).click();
          await regions.nth(3).getByRole('button', { name: texts.slow.step, exact: true }).click();
          await regions.nth(3).getByRole('button', { name: texts.slow.step, exact: true }).click();
          await expect(page.locator('path[data-active]')).toHaveCount(1);
          expect(await axeViolations(page), `${viewport.width} px, slow step mode`).toEqual([]);
          await crib.getByRole('textbox', { name: texts.crib.crib }).fill('WETTER');
          await crib.getByRole('button', { name: texts.crib.slideRight }).click();
          await expect(page.locator('[data-crash]')).not.toHaveCount(0);
          expect(await axeViolations(page), `${viewport.width} px, crash`).toEqual([]);
          // Barbarossa part 1 with its crib at its place, and the note about the rings.
          await crib.getByRole('button', { name: texts.crib.barbarossa }).click();
          await expect(crib.getByRole('textbox', { name: texts.crib.crib })).toHaveValue('OWAXNORDWESTLXSE');
          expect(await axeViolations(page), `${viewport.width} px, Barbarossa`).toEqual([]);
        }
      });
    }

    // Home with a typed secret: the lit lamp, both strips, the two lab buttons and "Forget my secret".
    for (const locale of LOCALE_PATHS) {
      test(`${locale} with a typed secret has no axe violations, on a desktop and a phone`, async ({ page }) => {
        for (const viewport of [
          { width: 1280, height: 800 },
          { width: 390, height: 844 },
        ]) {
          await page.setViewportSize(viewport);
          await openPage(page, locale);
          await page.getByRole('textbox').fill('Olá, Turing!');
          await expect(page.locator('[data-lit]')).toHaveCount(1);
          await expect(page.locator('a[href$="#my-secret"]')).toHaveCount(2);
          expect(await axeViolations(page), `${viewport.width} px`).toEqual([]);
        }
      });
    }

    // Home's secret loaded into the Enigma lab, typed, and the answer checked.
    for (const locale of LOCALE_PATHS) {
      test(`${locale}/enigma with Home's secret loaded and checked has no axe violations`, async ({ page }) => {
        await openPage(page, locale);
        await page.getByRole('textbox').fill('Olá, Turing!');
        await page.locator('a[href$="/enigma#my-secret"]').click();
        const box = page.locator('#decrypt-title').locator('..');
        await expect(box.locator('#decrypt-title')).toBeFocused();
        // The box's buttons: "Type it for me", then "Check my answer".
        await box.getByRole('button').nth(0).click();
        await box.getByRole('button').nth(1).click();
        await expect(box.locator('[aria-live]')).not.toBeEmpty();
        expect(await axeViolations(page)).toEqual([]);
      });
    }

    // A real message loaded and typed, the answer checked, and every "What it says" open.
    for (const locale of LOCALE_PATHS) {
      test(`${locale}/enigma with a loaded message, a checked answer and open texts has no axe violations, on a desktop and a phone`, async ({ page }) => {
        for (const viewport of [
          { width: 1280, height: 800 },
          { width: 390, height: 844 },
        ]) {
          await page.setViewportSize(viewport);
          await openLab(page, `${locale}/enigma`);
          // The last card is the Scharnhorst message, with one button: load.
          await page.getByRole('article').last().getByRole('button').click();
          const box = page.locator('#decrypt-title').locator('..');
          // The box's buttons: "Type it for me", then "Check my answer".
          await box.getByRole('button').nth(0).click();
          await box.getByRole('button').nth(1).click();
          await expect(box.locator('[aria-live]')).not.toBeEmpty();
          for (const summary of await page.locator('summary').all()) await summary.click();
          expect(await axeViolations(page), `${viewport.width} px`).toEqual([]);
        }
      });
    }

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
