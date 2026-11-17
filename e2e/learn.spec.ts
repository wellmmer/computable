import { expect, test, type Page } from '@playwright/test';
import { openPage } from './helpers';

/** The Learn page and lesson 1 in each language (spec R2a 2.1 and 2.2). */
const LANGUAGES = [
  { path: '/en', learn: 'Learn', title: 'Intuition: the human computer', position: 'Lesson 1 of 1' },
  { path: '/pt-br', learn: 'Aprender', title: 'Intuição: o computador humano', position: 'Lição 1 de 1' },
  { path: '/es', learn: 'Aprender', title: 'Intuición: el computador humano', position: 'Lección 1 de 1' },
  { path: '/fr', learn: 'Apprendre', title: 'Intuition : le calculateur humain', position: 'Leçon 1 sur 1' },
  { path: '/de', learn: 'Lernen', title: 'Intuition: der menschliche Rechner', position: 'Lektion 1 von 1' },
] as const;

/** The right option of each question in lesson 1's quiz, by its place in the list (content/lessons/intuition/quiz.ts). */
const RIGHT_OPTIONS = [1, 2, 0, 2, 1];

const question = (page: Page, number: number) => page.getByRole('group', { name: new RegExp(`^Question ${number} of 5`) });

for (const { path, learn, title, position } of LANGUAGES) {
  test(`${path}/learn lists lesson 1 and opens it`, async ({ page }) => {
    await openPage(page, `${path}/learn`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(learn);
    await page.getByRole('link', { name: title }).click();
    await expect(page).toHaveURL(new RegExp(`${path}/learn/intuition$`));
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
    await expect(page.getByText(position)).toBeVisible();
    await expect(page.locator('figure')).toHaveCount(2);
  });
}

test('one lesson end to end: run a machine, answer the quiz, see the score on the Learn page', async ({ page }) => {
  await openPage(page, '/en/learn/intuition');
  const machine = page.getByRole('figure', { name: 'Binary +1' });
  await machine.getByRole('button', { name: 'Run' }).click();
  await expect(machine.getByTestId('result-line')).toHaveText('Accepted after 8 steps. The tape now reads 1100.', { timeout: 10_000 });

  // Four right answers, and a wrong one for question 5.
  for (const [index, right] of RIGHT_OPTIONS.entries()) {
    const group = question(page, index + 1);
    const choice = index === 4 ? (right + 1) % 3 : right;
    await group.getByRole('radio').nth(choice).check();
    await group.getByRole('button', { name: 'Check' }).click();
    await expect(group.getByText(index === 4 ? 'Not quite.' : 'Right.')).toBeVisible();
  }
  await expect(page.getByRole('status').filter({ hasText: 'You got' })).toHaveText('You got 4 of 5 right. Your result is saved in this browser only.');

  await page.getByRole('navigation', { name: 'Lessons' }).getByRole('link', { name: 'All lessons' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Learn');
  await expect(page.getByText('Quiz: 4 of 5')).toBeVisible();
  await page.reload();
  await expect(page.getByText('Quiz: 4 of 5')).toBeVisible();

  await page.getByRole('button', { name: 'Reset my progress' }).click();
  await page.getByRole('button', { name: 'Yes, clear them' }).click();
  await expect(page.getByText('Not started')).toBeVisible();
  await expect(page.getByText('Your quiz results are cleared.')).toBeVisible();
});

test('the quiz works with the keyboard only', async ({ page }) => {
  await openPage(page, '/en/learn/intuition');
  // The last link before the quiz: from there, Tab walks into question 1.
  await page.getByRole('figure', { name: 'Binary +1' }).getByRole('link', { name: 'Open in the simulator' }).focus();
  for (const [index, right] of RIGHT_OPTIONS.entries()) {
    const group = question(page, index + 1);
    await page.keyboard.press('Tab');
    await expect(group.getByRole('radio').first()).toBeFocused();
    // Space checks the first option; each arrow key moves to the next option and checks it.
    if (right === 0) await page.keyboard.press('Space');
    for (let step = 0; step < right; step++) await page.keyboard.press('ArrowDown');
    await expect(group.getByRole('radio').nth(right)).toBeChecked();
    await page.keyboard.press('Tab');
    await expect(group.getByRole('button', { name: 'Check' })).toBeFocused();
    await page.keyboard.press('Enter');
    // The answer takes the focus, so a screen reader reads it at once.
    await expect(group.locator('p', { hasText: 'Right.' })).toBeFocused();
  }
  await expect(page.getByText('You got 5 of 5 right.')).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Try again' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { level: 2, name: 'Check what you learned' })).toBeFocused();
  await expect(question(page, 1).getByRole('radio').first()).not.toBeChecked();
});

test('"Open in the simulator" opens the lesson machine through a share link', async ({ page }) => {
  await openPage(page, '/en/learn/intuition');
  await page.getByRole('figure', { name: 'Turing 1936: 0 1 0 1…' }).getByRole('link', { name: 'Open in the simulator' }).click();
  await expect(page).toHaveURL(/\/en\/simulator$/);
  await expect(page.getByRole('combobox', { name: 'Example' })).toHaveValue('turing-1936');
});

test('a lesson machine never runs by itself', async ({ page }) => {
  await openPage(page, '/en/learn/intuition');
  const machine = page.getByRole('figure', { name: 'Turing 1936: 0 1 0 1…' });
  await page.waitForTimeout(1_500);
  await expect(machine.getByTestId('step-sentence')).toHaveText('Ready. The head starts on cell 0 in state 𝔟.');
});
