import { expect, test, type Page } from '@playwright/test';
import { LOCALE_PATHS, openPage } from './helpers';

/**
 * The Learn page and the 6 lessons in each language (spec R2a 2.1 and 2.2, spec R2b 2): each lesson's
 * title, its place, and its number of figures (lesson 3 has a machine and the encoding; lessons 5 and 6 have none).
 */
const LANGUAGES = [
  {
    path: '/en',
    learn: 'Learn',
    lessons: [
      { slug: 'intuition', title: 'Intuition: the human computer', position: 'Lesson 1 of 6', machines: 2 },
      { slug: 'formal-definition', title: 'The formal definition', position: 'Lesson 2 of 6', machines: 1 },
      { slug: 'universal-machine', title: 'The universal machine', position: 'Lesson 3 of 6', machines: 2 },
      { slug: 'halting-problem', title: 'The halting problem', position: 'Lesson 4 of 6', machines: 2 },
      { slug: 'entscheidungsproblem', title: 'The Entscheidungsproblem', position: 'Lesson 5 of 6', machines: 0 },
      { slug: 'church-turing', title: 'The Church–Turing thesis', position: 'Lesson 6 of 6', machines: 0 },
    ],
  },
  {
    path: '/pt-br',
    learn: 'Aprender',
    lessons: [
      { slug: 'intuition', title: 'Intuição: o computador humano', position: 'Lição 1 de 6', machines: 2 },
      { slug: 'formal-definition', title: 'A definição formal', position: 'Lição 2 de 6', machines: 1 },
      { slug: 'universal-machine', title: 'A máquina universal', position: 'Lição 3 de 6', machines: 2 },
      { slug: 'halting-problem', title: 'O problema da parada', position: 'Lição 4 de 6', machines: 2 },
      { slug: 'entscheidungsproblem', title: 'O Entscheidungsproblem', position: 'Lição 5 de 6', machines: 0 },
      { slug: 'church-turing', title: 'A tese de Church–Turing', position: 'Lição 6 de 6', machines: 0 },
    ],
  },
  {
    path: '/es',
    learn: 'Aprender',
    lessons: [
      { slug: 'intuition', title: 'Intuición: el computador humano', position: 'Lección 1 de 6', machines: 2 },
      { slug: 'formal-definition', title: 'La definición formal', position: 'Lección 2 de 6', machines: 1 },
      { slug: 'universal-machine', title: 'La máquina universal', position: 'Lección 3 de 6', machines: 2 },
      { slug: 'halting-problem', title: 'El problema de la parada', position: 'Lección 4 de 6', machines: 2 },
      { slug: 'entscheidungsproblem', title: 'El Entscheidungsproblem', position: 'Lección 5 de 6', machines: 0 },
      { slug: 'church-turing', title: 'La tesis de Church–Turing', position: 'Lección 6 de 6', machines: 0 },
    ],
  },
  {
    path: '/fr',
    learn: 'Apprendre',
    lessons: [
      { slug: 'intuition', title: 'Intuition : le calculateur humain', position: 'Leçon 1 sur 6', machines: 2 },
      { slug: 'formal-definition', title: 'La définition formelle', position: 'Leçon 2 sur 6', machines: 1 },
      { slug: 'universal-machine', title: 'La machine universelle', position: 'Leçon 3 sur 6', machines: 2 },
      { slug: 'halting-problem', title: 'Le problème de l’arrêt', position: 'Leçon 4 sur 6', machines: 2 },
      { slug: 'entscheidungsproblem', title: 'L’Entscheidungsproblem', position: 'Leçon 5 sur 6', machines: 0 },
      { slug: 'church-turing', title: 'La thèse de Church–Turing', position: 'Leçon 6 sur 6', machines: 0 },
    ],
  },
  {
    path: '/de',
    learn: 'Lernen',
    lessons: [
      { slug: 'intuition', title: 'Intuition: der menschliche Rechner', position: 'Lektion 1 von 6', machines: 2 },
      { slug: 'formal-definition', title: 'Die formale Definition', position: 'Lektion 2 von 6', machines: 1 },
      { slug: 'universal-machine', title: 'Die universelle Maschine', position: 'Lektion 3 von 6', machines: 2 },
      { slug: 'halting-problem', title: 'Das Halteproblem', position: 'Lektion 4 von 6', machines: 2 },
      { slug: 'entscheidungsproblem', title: 'Das Entscheidungsproblem', position: 'Lektion 5 von 6', machines: 0 },
      { slug: 'church-turing', title: 'Die Church-Turing-These', position: 'Lektion 6 von 6', machines: 0 },
    ],
  },
] as const;

/** The right option of each question in lesson 1's quiz, by its place in the list (content/lessons/intuition/quiz.ts). */
const RIGHT_OPTIONS = [1, 2, 0, 2, 1];

/** The same for lesson 2 (content/lessons/formal-definition/quiz.ts). */
const RIGHT_OPTIONS_2 = [1, 2, 0, 3, 1];

/** The same for lesson 4 (content/lessons/halting-problem/quiz.ts). */
const RIGHT_OPTIONS_4 = [1, 2, 0, 2, 0];

/** The same for lesson 6 (content/lessons/church-turing/quiz.ts). */
const RIGHT_OPTIONS_6 = [1, 2, 0, 1, 2];

const question = (page: Page, number: number) => page.getByRole('group', { name: new RegExp(`^Question ${number} of 5`) });

/** The row of one lesson on the Learn page. */
const lessonRow = (page: Page, title: string) => page.getByRole('listitem').filter({ has: page.getByRole('link', { name: title }) });

for (const { path, learn, lessons } of LANGUAGES) {
  test(`${path}/learn lists the 6 lessons in order and opens each one`, async ({ page }) => {
    await openPage(page, `${path}/learn`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(learn);
    await expect(page.getByRole('main').getByRole('listitem').getByRole('heading', { level: 2 })).toHaveText(lessons.map(({ title }) => title));
    for (const { slug, title, position, machines } of lessons) {
      await openPage(page, `${path}/learn`);
      await page.getByRole('link', { name: title }).click();
      await expect(page).toHaveURL(new RegExp(`${path}/learn/${slug}$`));
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
      // The tab shows the title without the soft hyphen of lesson 5.
      expect(await page.title(), slug).toContain(title);
      await expect(page.getByText(position)).toBeVisible();
      await expect(page.locator('figure')).toHaveCount(machines);
    }
  });
}

/** The Learn page's link to the reading guide, and the guide's title, in each language (spec R2c 3). */
const GUIDE_LINKS = [
  { path: '/en', link: 'Read Turing’s 1936 paper', title: 'Turing’s 1936 paper' },
  { path: '/pt-br', link: 'Leia o artigo de Turing de 1936', title: 'O artigo de Turing de 1936' },
  { path: '/es', link: 'Lee el artículo de Turing de 1936', title: 'El artículo de Turing de 1936' },
  { path: '/fr', link: 'Lire l’article de Turing de 1936', title: 'L’article de Turing de 1936' },
  { path: '/de', link: 'Turings Arbeit von 1936 lesen', title: 'Turings Arbeit von 1936' },
] as const;

for (const { path, link, title } of GUIDE_LINKS) {
  test(`${path}/learn links the reading guide after lesson 6, and the link opens it`, async ({ page }) => {
    await openPage(page, `${path}/learn`);
    // The guide comes after the list of lessons.
    const afterLessons = await page.evaluate((name) => {
      const lessons = document.querySelector('main ol');
      const guide = [...document.querySelectorAll('main a')].find((anchor) => anchor.textContent === name);
      return lessons !== null && guide !== undefined && Boolean(lessons.compareDocumentPosition(guide) & Node.DOCUMENT_POSITION_FOLLOWING);
    }, link);
    expect(afterLessons).toBe(true);
    await page.getByRole('link', { name: link }).click();
    await expect(page).toHaveURL(new RegExp(`${path}/learn/paper$`));
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
  });
}

test('lesson 6 leads to the reading guide in the same language', async ({ page }) => {
  await openPage(page, '/pt-br/learn/church-turing');
  await page.getByRole('navigation', { name: 'Lições' }).getByRole('link', { name: 'Próximo: O artigo de Turing de 1936' }).click();
  await expect(page).toHaveURL(/\/pt-br\/learn\/paper$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('O artigo de Turing de 1936');
});

test('the previous and next links join the 6 lessons in order, and lesson 6 leads to the reading guide', async ({ page }) => {
  await openPage(page, '/en/learn/intuition');
  const nav = page.getByRole('navigation', { name: 'Lessons' });
  await expect(nav.getByRole('link', { name: /^Previous lesson/ })).toHaveCount(0);
  await nav.getByRole('link', { name: 'Next lesson: The formal definition' }).click();
  await expect(page).toHaveURL(/\/en\/learn\/formal-definition$/);
  await nav.getByRole('link', { name: 'Next lesson: The universal machine' }).click();
  await expect(page).toHaveURL(/\/en\/learn\/universal-machine$/);
  await nav.getByRole('link', { name: 'Next lesson: The halting problem' }).click();
  await expect(page).toHaveURL(/\/en\/learn\/halting-problem$/);
  await nav.getByRole('link', { name: 'Next lesson: The Entscheidungsproblem' }).click();
  await expect(page).toHaveURL(/\/en\/learn\/entscheidungsproblem$/);
  await nav.getByRole('link', { name: 'Next lesson: The Church–Turing thesis' }).click();
  await expect(page).toHaveURL(/\/en\/learn\/church-turing$/);
  await expect(nav.getByRole('link', { name: /^Next lesson/ })).toHaveCount(0);
  await expect(nav.getByRole('link')).toHaveText(['Previous lesson: The Entscheidungsproblem', 'All lessons', 'Next: Turing’s 1936 paper']);
  await nav.getByRole('link', { name: 'Previous lesson: The Entscheidungsproblem' }).click();
  await nav.getByRole('link', { name: 'Previous lesson: The halting problem' }).click();
  await nav.getByRole('link', { name: 'Previous lesson: The universal machine' }).click();
  await expect(page).toHaveURL(/\/en\/learn\/universal-machine$/);
  await nav.getByRole('link', { name: 'Previous lesson: The formal definition' }).click();
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

test('lesson 3: Tab onto a row of the encoding, or point at it, to mark its part of the description and the number', async ({ page }) => {
  await openPage(page, '/en/learn/universal-machine');
  const encoding = page.getByRole('figure', { name: 'Turing’s first machine, written as a description' });
  const rows = encoding.getByRole('row');
  const marks = encoding.locator('mark');
  // The last link before the encoding: from there, Tab walks onto its first row.
  await page.getByRole('figure', { name: 'Turing 1936: 0 1 0 1…' }).getByRole('link', { name: 'Open in the simulator' }).focus();
  await page.keyboard.press('Tab');
  await expect(rows.nth(1)).toBeFocused();
  await expect(marks).toHaveText(['DADDCRDAA;', '3133253117']);
  await page.keyboard.press('Tab');
  await expect(rows.nth(2)).toBeFocused();
  await expect(marks).toHaveText(['DAADDRDAAA;', '31133531117']);
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await expect(rows.nth(4)).toBeFocused();
  await expect(marks).toHaveText(['DAAAADDRDA;', '31111335317']);
  // Leaving the table clears the mark.
  await page.keyboard.press('Tab');
  await expect(marks).toHaveCount(0);

  await rows.nth(3).hover();
  await expect(marks).toHaveText(['DAAADDCCRDAAAA;', '311133225311117']);
  await expect(encoding.getByTestId('encoding-sd')).toHaveText('DADDCRDAA;DAADDRDAAA;DAAADDCCRDAAAA;DAAAADDRDA;');
  await expect(encoding.getByTestId('encoding-dn')).toHaveText('31332531173113353111731113322531111731111335317');
});

test('lesson 4 end to end: one machine stops, one keeps running, then the quiz score shows on the Learn page', async ({ page }) => {
  await openPage(page, '/en/learn/halting-problem');
  const stops = page.getByRole('figure', { name: 'Binary +1' });
  await stops.getByRole('button', { name: 'Run' }).click();
  await expect(stops.getByTestId('result-line')).toHaveText('Accepted after 8 steps. The tape now reads 1100.', { timeout: 10_000 });

  const forever = page.getByRole('figure', { name: 'Turing 1936: 0 1 0 1…' });
  await forever.getByRole('button', { name: 'Run' }).click();
  // One step every 700 ms: after 3 seconds the machine still runs, and no result line shows.
  await page.waitForTimeout(3_000);
  await expect(forever.getByTestId('result-line')).toHaveCount(0);
  await forever.getByRole('button', { name: 'Pause' }).click();
  await expect(forever.getByRole('button', { name: 'Run' })).toBeVisible();
  await expect(forever.getByTestId('step-sentence')).not.toHaveText(/^Ready/);

  // Four right answers, and a wrong one for question 3.
  for (const [index, right] of RIGHT_OPTIONS_4.entries()) {
    const group = question(page, index + 1);
    const choice = index === 2 ? 1 : right;
    await group.getByRole('radio').nth(choice).check();
    await group.getByRole('button', { name: 'Check' }).click();
    await expect(group.getByText(index === 2 ? 'Not quite.' : 'Right.', { exact: true })).toBeVisible();
  }
  await expect(page.getByRole('status').filter({ hasText: 'You got' })).toHaveText('You got 4 of 5 right. Your result is saved in this browser only.');

  await page.getByRole('navigation', { name: 'Lessons' }).getByRole('link', { name: 'All lessons' }).click();
  await expect(lessonRow(page, 'The halting problem').getByText('Quiz: 4 of 5')).toBeVisible();
  await expect(lessonRow(page, 'The universal machine').getByText('Not started')).toBeVisible();
});

test('lesson 6 end to end: answer the quiz, then the score shows on the Learn page', async ({ page }) => {
  await openPage(page, '/en/learn/church-turing');
  await expect(page.locator('figure')).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 2, name: 'Sources' })).toBeVisible();

  // Four right answers, and a wrong one for question 4.
  for (const [index, right] of RIGHT_OPTIONS_6.entries()) {
    const group = question(page, index + 1);
    const choice = index === 3 ? 0 : right;
    await group.getByRole('radio').nth(choice).check();
    await group.getByRole('button', { name: 'Check' }).click();
    await expect(group.getByText(index === 3 ? 'Not quite.' : 'Right.', { exact: true })).toBeVisible();
  }
  await expect(page.getByRole('status').filter({ hasText: 'You got' })).toHaveText('You got 4 of 5 right. Your result is saved in this browser only.');

  await page.getByRole('navigation', { name: 'Lessons' }).getByRole('link', { name: 'All lessons' }).click();
  await expect(lessonRow(page, 'The Church–Turing thesis').getByText('Quiz: 4 of 5')).toBeVisible();
  await expect(lessonRow(page, 'The Entscheidungsproblem').getByText('Not started')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Read Turing’s 1936 paper' })).toBeVisible();
});

/**
 * Where the lesson title breaks onto a new line inside a word: the title with a "|" at each such
 * break. A break is fine after a space, a dash or a soft hyphen (U+00AD), and nowhere else.
 */
function titleBreaksInsideWords(page: Page) {
  return page.locator('main h1').evaluate((title) => {
    const chars: { char: string; top: number | null }[] = [];
    const walker = document.createTreeWalker(title, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode() as Text | null; node !== null; node = walker.nextNode() as Text | null) {
      for (let i = 0; i < node.data.length; i++) {
        const range = document.createRange();
        range.setStart(node, i);
        range.setEnd(node, i + 1);
        // A letter right after a break also gets an empty box at the end of the line before: skip it.
        const box = [...range.getClientRects()].filter(({ width }) => width > 0).at(-1);
        chars.push({ char: node.data[i], top: box === undefined ? null : Math.round(box.top) });
      }
    }
    const text = chars.map(({ char }) => char).join('');
    const breaks: string[] = [];
    let previous = -1;
    chars.forEach(({ top }, i) => {
      if (top === null) return;
      const previousTop = previous >= 0 ? chars[previous].top : null;
      if (previousTop !== null && top > previousTop && !/[\s\u00AD–-]/.test(text.slice(previous, i))) {
        breaks.push(`${text.slice(0, i)}|${text.slice(i)}`);
      }
      previous = i;
    });
    return breaks;
  });
}

test('lessons 3 to 6 fit a 390 px phone screen in every language, tables and titles included', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of LOCALE_PATHS) {
    for (const slug of ['universal-machine', 'halting-problem', 'entscheidungsproblem', 'church-turing']) {
      await openPage(page, `${path}/learn/${slug}`);
      const overflow = await page.evaluate(() => ({
        page: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        tables: [...document.querySelectorAll('main table')].filter((table) => table.getBoundingClientRect().right > document.documentElement.clientWidth).length,
      }));
      // "Entscheidungsproblem" is wider than the phone at 40 px. It may break only after "Entscheidungs".
      const titleBreaks = await titleBreaksInsideWords(page);
      expect({ ...overflow, titleBreaks }, `${path}/learn/${slug}`).toEqual({ page: 0, tables: 0, titleBreaks: [] });
    }
  }
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
  // All 6 lessons: lessons 2 to 6 were never started.
  await expect(page.getByText('Not started')).toHaveCount(6);
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
