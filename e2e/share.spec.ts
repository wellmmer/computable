import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { openSimulator, pickExample } from './helpers';

test.describe('share links (spec 5.6)', () => {
  test('a copied link opens the same machine in a new tab', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await openSimulator(page);
    await pickExample(page, 'Palindrome checker');
    await page.getByRole('textbox', { name: 'Input' }).fill('101');
    await page.getByRole('button', { name: 'Copy share link' }).click();
    await expect(page.getByText('Link copied.')).toBeVisible();
    const link = await page.evaluate(() => navigator.clipboard.readText());

    const other = await context.newPage();
    await other.goto(link);
    await expect(other.getByRole('heading', { level: 1 })).toHaveText('Palindrome checker');
    await expect(other.getByRole('textbox', { name: 'Input' })).toHaveValue('101');
    // The page drops the link from the address bar, so a reload keeps later changes.
    await expect(other).toHaveURL(/\/en\/simulator$/);
  });

  test('a link pasted into an open tab opens, and the next Back leaves the page', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await openSimulator(page);
    await pickExample(page, 'Palindrome checker');
    await page.getByRole('button', { name: 'Copy share link' }).click();
    const hash = new URL(await page.evaluate(() => navigator.clipboard.readText())).hash;

    await page.goto('/en');
    await openSimulator(page);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Palindrome checker');
    await pickExample(page, 'Binary +1');
    // Setting the hash adds a history entry, as pasting a link into the address bar does.
    await page.evaluate((linkHash) => {
      window.location.hash = linkHash;
    }, hash);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Palindrome checker');
    await expect(page).toHaveURL(/\/en\/simulator$/);
    await page.goBack();
    await expect(page).toHaveURL(/\/en$/);
  });

  test('a broken link keeps the current machine and says so', async ({ page }) => {
    await openSimulator(page, '#m=broken');
    await expect(page.getByText('This link does not hold a Computable machine. The simulator kept the current machine.')).toBeVisible();
    await pickExample(page, 'Palindrome checker');
    await expect(page.getByText('This link does not hold a Computable machine.', { exact: false })).toHaveCount(0);
  });

  test('a link asks before it replaces a machine the visitor built', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await openSimulator(page);
    await pickExample(page, 'Palindrome checker');
    await page.getByRole('button', { name: 'Copy share link' }).click();
    const hash = new URL(await page.evaluate(() => navigator.clipboard.readText())).hash;

    // Build a machine: Binary +1 with one rule changed is no longer an example.
    await pickExample(page, 'Binary +1');
    await page.getByRole('textbox', { name: 'Rule 5: then go to' }).fill('qR');
    const question = page.getByRole('dialog', { name: 'Replace your machine?' });

    // "Keep mine" keeps the built machine and drops the link from the address.
    await page.goto('/en');
    await openSimulator(page, hash);
    await expect(question).toBeVisible();
    await expect(question.getByRole('button', { name: 'Keep mine' })).toBeFocused();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await question.getByRole('button', { name: 'Keep mine' }).click();
    await expect(question).toBeHidden();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Binary +1');
    await expect(page.getByRole('textbox', { name: 'Rule 5: then go to' })).toHaveValue('qR');
    await expect(page).toHaveURL(/\/en\/simulator$/);
    await page.reload();
    await expect(page.getByRole('textbox', { name: 'Rule 5: then go to' })).toHaveValue('qR');
    await expect(question).toBeHidden();

    // "Replace" opens the link's machine.
    await page.goto('/en');
    await openSimulator(page, hash);
    await question.getByRole('button', { name: 'Replace' }).click();
    await expect(question).toBeHidden();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Palindrome checker');
    await expect(page).toHaveURL(/\/en\/simulator$/);
  });
});
