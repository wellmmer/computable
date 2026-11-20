import { expect, test } from '@playwright/test';
import { openLab, openSimulator, PAGES } from './helpers';

/**
 * Tailwind 4 gives buttons the default arrow cursor. Every enabled button shows the hand instead,
 * and a framed button lifts a little under the mouse, so a visitor sees what can be clicked.
 */
test.describe('buttons under the mouse', () => {
  for (const { name, path } of [...PAGES, { name: 'simulator', path: '/en/simulator' }]) {
    test(`every enabled button on the ${name} page shows the hand cursor`, async ({ page }) => {
      await page.goto(path);
      const arrows = await page.locator('button:not(:disabled):visible').evaluateAll((buttons) =>
        buttons.filter((button) => getComputedStyle(button).cursor !== 'pointer').map((button) => button.textContent?.trim() || button.getAttribute('aria-label')),
      );
      expect(arrows).toEqual([]);
    });
  }

  test('a framed button lifts and shows a shadow under the mouse', async ({ page }) => {
    await openLab(page, '/en/enigma');
    const button = page.getByRole('button', { name: 'Clear' });
    await expect(button).toHaveCSS('box-shadow', 'none');
    await button.hover();
    await expect(button).not.toHaveCSS('box-shadow', 'none');
    await expect(button).not.toHaveCSS('translate', 'none');
  });

  test('with reduced motion, a framed button shows the shadow but does not move', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openSimulator(page);
    const button = page.getByRole('button', { name: 'Step', exact: true });
    await button.hover();
    await expect(button).not.toHaveCSS('box-shadow', 'none');
    await expect(button).toHaveCSS('translate', 'none');
  });

  test('an Enigma key lights its edge under the mouse', async ({ page }) => {
    await openLab(page, '/en/enigma');
    const key = page.getByRole('group', { name: 'Keyboard' }).getByRole('button', { name: 'Q' });
    await expect(key).toHaveCSS('box-shadow', 'none');
    await key.hover();
    await expect(key).not.toHaveCSS('box-shadow', 'none');
  });
});
