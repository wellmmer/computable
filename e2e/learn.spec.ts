import { expect, test, type Page } from '@playwright/test';
import { openPage } from './helpers';

/** The Learn page and both lessons in each language (spec R2a 2.1 and 2.2): each lesson's title, its place, and its number of machines. */
const LANGUAGES = [
  {
    path: '/en',
    learn: 'Learn',
    lessons: [
      { slug: 'intuition', title: 'Intuition: the human computer', position: 'Lesson 1 of 2', machines: 2 },
      { slug: 'formal-definition', title: 'The formal definition', position: 'Lesson 2 of 2', machines: 1 },
    ],
  },
  {
    path: '/pt-br',
    learn: 'Aprender',
    lessons: [
      { slug: 'intuition', title: 'Intuição: o computador humano', position: 'Lição 1 de 2', machines: 2 },
      { slug: 'formal-definition', title: 'A definição formal', position: 'Lição 2 de 2', machines: 1 },
    ],
  },
  {
    path: '/es',
    learn: 'Aprender',
    lessons: [
      { slug: 'intuition', title: 'Intuición: el computador humano', position: 'Lección 1 de 2', machines: 2 },
      { slug: 'formal-definition', title: 'La definición formal', position: 'Lección 2 de 2', machines: 1 },
    ],
  },
  {
    path: '/fr',
    learn: 'Apprendre',
    lessons: [
      { slug: 'intuition', title: 'Intuition : le calculateur humain', position: 'Leçon 1 sur 2', machines: 2 },
      { slug: 'formal-definition', title: 'La définition formelle', position: 'Leçon 2 sur 2', machines: 1 },
    ],
  },
  {
    path: '/de',
    learn: 'Lernen',
    lessons: [
      { slug: 'intuition', title: 'Intuition: der menschliche Rechner', position: 'Lektion 1 von 2', machines: 2 },
      { slug: 'formal-definition', title: 'Die formale Definition', position: 'Lektion 2 von 2', machines: 1 },
    ],
  },
] as const;

/** The right option of each question in lesson 1's quiz, by its place in the list (content/lessons/intuition/quiz.ts). */
const RIGHT_OPTIONS = [1, 2, 0, 2, 1];

/** The same for lesson 2 (content/lessons/formal-definition/quiz.ts). */
const RIGHT_OPTIONS_2 = [1, 2, 0, 3, 1];

const question = (page: Page, number: number) => page.getByRole('group', { name: new RegExp(`^Question ${number} of 5`) });

/** The row of one lesson on the Learn page. */
const lessonRow = (page: Page, title: string) => page.getByRole('listitem').filter({ has: page.getByRole('link', { name: title }) });

for (const { path, learn, lessons } of LANGUAGES) {
  test(`${path}/learn lists both lessons in order and opens each one`, async ({ page }) => {
    await openPage(page, `${path}/learn`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(learn);
    await expect(page.getByRole('main').getByRole('listitem').getByRole('heading', { level: 2 })).toHaveText(lessons.map(({ title }) => title));
    for (const { slug, title, position, machines } of lessons) {
      await openPage(page, `${path}/learn`);
      await page.getByRole('link', { name: title }).click();
      await expect(page).toHaveURL(new RegExp(`${path}/learn/${slug}$`));
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
      await expect(page.getByText(position)).toBeVisible();
      await expect(page.locator('figure')).toHaveCount(machines);
    }
  });
}

test('the previous and next links join lesson 1 and lesson 2', async ({ page }) => {
  await openPage(page, '/en/learn/intuition');
  const nav = page.getByRole('navigation', { name: 'Lessons' });
  await expect(nav.getByRole('link', { name: /^Previous lesson/ })).toHaveCount(0);
  await nav.getByRole('link', { name: 'Next lesson: The formal definition' }).click();
  await expect(page).toHaveURL(/\/en\/learn\/formal-definition$/);
  await expect(nav.getByRole('link', { name: /^Next lesson/ })).toHaveCount(0);
  await nav.getByRole('link', { name: 'Previous lesson: Intuition: the human computer' }).click();
  await expect(page).toHaveURL(/\/en\/learn\/intuition$/);

  await openPage(page, '/pt-br/learn/formal-definition');
  await page.getByRole('navigation', { name: 'Lições' }).getByRole('link', { name: 'Lição anterior: Intuição: o computador humano' }).click();
  await expect(page).toHaveURL(/\/pt-br\/learn\/intuition$/);
});

test('lesson 2 end to end: run the palindrome machine, answer the quiz, see the score on the Learn page', async ({ page }) => {
  await openPage(page, '/en/learn/formal-definition');
  const machine = page.getByRole('figure', { name: 'Palindrome checker' });
  await machine.getByRole('button', { name: 'Run' }).click();
  // 15 steps, one every 700 ms at the default speed: about 10 seconds.
  await expect(machine.getByTestId('result-line')).toHaveText('Accepted after 15 steps. The tape is now blank.', { timeout: 20_000 });

  // Four right answers, and a wrong one for question 2.
  for (const [index, right] of RIGHT_OPTIONS_2.entries()) {
    const group = question(page, index + 1);
    const choice = index === 1 ? 0 : right;
    await group.getByRole('radio').nth(choice).check();
    await group.getByRole('button', { name: 'Check' }).click();
    // Exact: the option "S moves the head two cells to the right." also contains "right.".
    await expect(group.getByText(index === 1 ? 'Not quite.' : 'Right.', { exact: true })).toBeVisible();
  }
  await expect(page.getByRole('status').filter({ hasText: 'You got' })).toHaveText('You got 4 of 5 right. Your result is saved in this browser only.');

  await page.getByRole('navigation', { name: 'Lessons' }).getByRole('link', { name: 'All lessons' }).click();
  await expect(lessonRow(page, 'The formal definition').getByText('Quiz: 4 of 5')).toBeVisible();
  await expect(lessonRow(page, 'Intuition: the human computer').getByText('Not started')).toBeVisible();
});

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
  const intuition = lessonRow(page, 'Intuition: the human computer');
  await expect(intuition.getByText('Quiz: 4 of 5')).toBeVisible();
  await page.reload();
  await expect(intuition.getByText('Quiz: 4 of 5')).toBeVisible();

  await page.getByRole('button', { name: 'Reset my progress' }).click();
  await page.getByRole('button', { name: 'Yes, clear them' }).click();
  // Both lessons: lesson 2 was never started.
  await expect(page.getByText('Not started')).toHaveCount(2);
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
