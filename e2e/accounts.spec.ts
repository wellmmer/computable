import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { ACCOUNTS_PORT, expectAccountButton, fakeSupabase, FAKE_SUPABASE_URL, seedBeforeLoad, signInBeforeLoad, type FakeRow } from './accounts';
import { openPage } from './helpers';

test.describe('without Supabase values (the normal build)', () => {
  test('the menu bar has no "Sign in" (spec R5b 2)', async ({ page }) => {
    const requests: string[] = [];
    page.on('request', (request) => requests.push(request.url()));
    await openPage(page, '/en/about');
    await expect(page.getByRole('banner').getByRole('button', { name: 'Tour' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in' })).toHaveCount(0);
    expect(requests.filter((url) => url.includes('supabase'))).toEqual([]);
  });

  test('Privacy says nothing about accounts, as before R5b (spec R5b 2)', async ({ page }) => {
    await openPage(page, '/en/privacy');
    await expect(
      page.getByText('Computable has no accounts and keeps no personal data about you. It sets one cookie, only to remember your language.'),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Optional accounts' })).toHaveCount(0);
  });
});

test.describe('with Supabase values (spec R5b 4)', () => {
  test.use({ baseURL: `http://localhost:${ACCOUNTS_PORT}` });

  test('Privacy says that accounts are optional, and what an account keeps', async ({ page }) => {
    await fakeSupabase(page, {});
    await openPage(page, '/en/privacy');
    await expect(
      page.getByText('Accounts are optional. Without one, Computable keeps no personal data about you. It sets one cookie, only to remember your language.'),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Optional accounts' })).toBeVisible();
  });

  test('"Sign in" opens the dialog with Google, GitHub and the note, and Esc closes it', async ({ page }) => {
    const { unexpected } = await fakeSupabase(page, {});
    await openPage(page, '/en/about');
    await expectAccountButton(page, 'Sign in');
    await page.getByRole('button', { name: 'Sign in' }).click();
    const dialog = page.getByRole('dialog', { name: 'Sign in' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Sign in to keep your machine and quiz scores on all your devices.')).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Continue with Google' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Continue with GitHub' })).toBeVisible();
    await expect(dialog.getByText('Optional. Everything works without an account.')).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Continue with Google' })).toHaveCSS('cursor', 'pointer');
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeFocused();
    expect(unexpected).toEqual([]);
  });

  test('a cancelled Google sign-in comes back to the same page with a message (spec R5b 6)', async ({ page }) => {
    let redirectTo = '';
    let provider = '';
    const { unexpected } = await fakeSupabase(page, {
      // Supabase sends the browser to Google. Here the person cancels, and Supabase sends it back with an error.
      'GET /auth/v1/authorize': async (route, url) => {
        provider = url.searchParams.get('provider') ?? '';
        redirectTo = url.searchParams.get('redirect_to') ?? '';
        const back = new URL(redirectTo);
        back.searchParams.set('error', 'access_denied');
        back.searchParams.set('error_code', 'access_denied');
        back.searchParams.set('error_description', 'The person cancelled the sign-in');
        await route.fulfill({ status: 303, headers: { location: back.toString() } });
      },
    });
    await openPage(page, '/en/enigma');
    await expectAccountButton(page, 'Sign in');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.getByRole('button', { name: 'Continue with Google' }).click();

    const dialog = page.getByRole('dialog', { name: 'Sign in' });
    await expect(dialog.getByRole('alert')).toHaveText('Sign-in did not finish. Try again, or keep working without an account.');
    expect(provider).toBe('google');
    expect(redirectTo).toBe(`http://localhost:${ACCOUNTS_PORT}/en/enigma`);
    // The error leaves the address, so a reload does not show it again.
    await expect(page).toHaveURL(`http://localhost:${ACCOUNTS_PORT}/en/enigma`);
    expect(unexpected).toEqual([]);
  });

  test('GitHub opens the GitHub sign-in through Supabase', async ({ page }) => {
    let provider = '';
    await fakeSupabase(page, {
      'GET /auth/v1/authorize': async (route, url) => {
        provider = url.searchParams.get('provider') ?? '';
        await route.fulfill({ status: 200, contentType: 'text/html', body: '<title>GitHub</title><h1>Fake GitHub</h1>' });
      },
    });
    await openPage(page, '/en/about');
    await expectAccountButton(page, 'Sign in');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.getByRole('button', { name: 'Continue with GitHub' }).click();
    await expect(page.getByRole('heading', { name: 'Fake GitHub' })).toBeVisible();
    expect(provider).toBe('github');
    expect(page.url().startsWith(`${FAKE_SUPABASE_URL}/auth/v1/authorize?`)).toBe(true);
  });

  test('signed in, the menu shows the name, and "Sign out" signs out in this browser only', async ({ page }) => {
    const person = await signInBeforeLoad(page);
    let scope = '';
    const { unexpected } = await fakeSupabase(page, {
      'POST /auth/v1/logout': async (route, url) => {
        scope = url.searchParams.get('scope') ?? '';
        await route.fulfill({ status: 204 });
      },
    });
    await openPage(page, '/en/about');
    await expectAccountButton(page, `Account: ${person.name}`);
    await page.getByRole('button', { name: `Account: ${person.name}` }).click();
    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeFocused();
    expect(scope).toBe('local');
    expect(await page.evaluate(() => localStorage.getItem('sb-computable-e2e-auth-token'))).toBeNull();
    expect(unexpected).toEqual([]);
  });

  test('"Sign out" works in this browser when the sign-out request fails', async ({ page }) => {
    const person = await signInBeforeLoad(page);
    let logoutCalls = 0;
    const { unexpected } = await fakeSupabase(page, {
      // The network fails. supabase-js removes the session before it sends this request.
      'POST /auth/v1/logout': async (route) => {
        logoutCalls += 1;
        await route.abort('internetdisconnected');
      },
    });
    await openPage(page, '/en/about');
    await expectAccountButton(page, `Account: ${person.name}`);
    await page.getByRole('button', { name: `Account: ${person.name}` }).click();
    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
    expect(logoutCalls).toBe(1);
    expect(await page.evaluate(() => localStorage.getItem('sb-computable-e2e-auth-token'))).toBeNull();
    expect(unexpected).toEqual([]);
  });

  test('"Delete my account" asks first, says when it fails, and signs out when it works', async ({ page }) => {
    const person = await signInBeforeLoad(page);
    let deleteCalls = 0;
    const { unexpected } = await fakeSupabase(page, {
      // The first call fails, as if the database were down. The second one works.
      'POST /rest/v1/rpc/delete_my_account': async (route) => {
        deleteCalls += 1;
        if (deleteCalls === 1) await route.fulfill({ status: 500, contentType: 'application/json', body: '{"message":"down"}' });
        else await route.fulfill({ status: 204 });
      },
      // After the deletion the login is gone, so Supabase answers the sign-out with 403. The browser signs out anyway.
      'POST /auth/v1/logout': async (route) => {
        await route.fulfill({ status: 403, contentType: 'application/json', body: '{"code":403,"error_code":"user_not_found"}' });
      },
    });
    await openPage(page, '/en/about');
    await expectAccountButton(page, `Account: ${person.name}`);
    await page.getByRole('button', { name: `Account: ${person.name}` }).click();
    await page.getByRole('button', { name: 'Delete my account' }).click();

    const dialog = page.getByRole('dialog', { name: 'Delete my account' });
    await expect(dialog.getByText('This deletes your account and the copy saved in it. This browser keeps its own copy.')).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeFocused();

    await dialog.getByRole('button', { name: 'Delete my account' }).click();
    await expect(dialog.getByRole('alert')).toHaveText('Your account was not deleted. Try again.');
    await expect(page.getByRole('button', { name: `Account: ${person.name}` })).toBeAttached();

    await dialog.getByRole('button', { name: 'Delete my account' }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeFocused();
    expect(deleteCalls).toBe(2);
    expect(unexpected).toEqual([]);
  });

  for (const width of [320, 390, 768, 1024, 1280]) {
    test(`at ${width}px the menu bar fits, signed in and in French signed out`, async ({ page }) => {
      await page.setViewportSize({ width, height: 700 });
      const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      await fakeSupabase(page, {});
      // French has the longest texts in the menu bar.
      await openPage(page, '/fr/about');
      await expectAccountButton(page, 'Se connecter');
      expect(await overflow()).toBe(0);

      await signInBeforeLoad(page);
      await openPage(page, '/en/about');
      await expectAccountButton(page, /^Account: /);
      expect(await overflow()).toBe(0);
      await page.locator('header').screenshot({ path: `test-results/screenshots/account-menu-${width}.png` });
    });
  }

  // French has the longest "Sign in" label. It must never wrap inside its button. When it shares a
  // row with "Soutenir le dev", it keeps the 16px gap that the menu bar puts between its groups.
  for (const width of [768, 1280]) {
    test(`at ${width}px "Se connecter" stays on one line, 16px or more from "Soutenir le dev"`, async ({ page }) => {
      await page.setViewportSize({ width, height: 700 });
      await fakeSupabase(page, {});
      await openPage(page, '/fr/about');
      await expectAccountButton(page, 'Se connecter');
      const banner = page.getByRole('banner');
      const signIn = banner.getByRole('button', { name: 'Se connecter' });

      // A wrapped label puts its words on 2 lines, so its text boxes have 2 different tops.
      const lines = await signIn.getByText('Se connecter').evaluate((label) => {
        const range = document.createRange();
        range.selectNodeContents(label);
        return new Set([...range.getClientRects()].map((box) => Math.round(box.top))).size;
      });
      expect(lines).toBe(1);

      const button = await signIn.boundingBox();
      const support = await banner.getByRole('link', { name: 'Soutenir le dev' }).boundingBox();
      if (button === null || support === null) throw new Error('The menu bar lost a button.');
      const sameRow = button.y < support.y + support.height && support.y < button.y + button.height;
      const gap = sameRow ? support.x - (button.x + button.width) : Number.POSITIVE_INFINITY;
      expect(gap).toBeGreaterThanOrEqual(15.5);
    });
  }

  // A name gets up to 160px in the menu bar, and Linux draws the same fonts a few pixels wider than
  // macOS. At every width the menu bar must make room for the name, or cut it with "…".
  for (const width of [320, 390, 768, 1024, 1280]) {
    test(`at ${width}px a long name makes no sideways scroll, and the menu bar keeps its right margin`, async ({ page }) => {
      await page.setViewportSize({ width, height: 700 });
      const person = await signInBeforeLoad(page, 'Ada Augusta King, Countess of Lovelace');
      await fakeSupabase(page, {});
      await openPage(page, '/en/about');
      await expectAccountButton(page, `Account: ${person.name}`);

      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
      // Every button and link of the menu bar ends inside the header's padding.
      const space = await page.getByRole('banner').evaluate((header) => {
        const row = header.firstElementChild;
        if (row === null) throw new Error('The menu bar has no row.');
        const contentRight = row.getBoundingClientRect().right - parseFloat(getComputedStyle(row).paddingRight);
        const rights = [...header.querySelectorAll('a, button')].map((item) => item.getBoundingClientRect().right);
        return contentRight - Math.max(...rights);
      });
      expect(space).toBeGreaterThanOrEqual(-0.5);
    });
  }

  for (const colorScheme of ['light', 'dark'] as const) {
    test.describe(`${colorScheme} mode`, () => {
      test.use({ colorScheme });

      test('the sign-in dialog with its message has no axe violations', async ({ page }) => {
        await fakeSupabase(page, {});
        await openPage(page, '/en/about?error=access_denied&error_description=Cancelled');
        await expect(page.getByRole('dialog', { name: 'Sign in' }).getByRole('alert')).toBeVisible();
        const results = await new AxeBuilder({ page }).analyze();
        expect(results.violations).toEqual([]);
      });

      test('the account list and the delete dialog have no axe violations', async ({ page }) => {
        const person = await signInBeforeLoad(page);
        await fakeSupabase(page, {
          'POST /rest/v1/rpc/delete_my_account': (route) => route.fulfill({ status: 500, contentType: 'application/json', body: '{}' }),
        });
        await openPage(page, '/en/about');
        await expectAccountButton(page, `Account: ${person.name}`);
        await page.getByRole('button', { name: `Account: ${person.name}` }).click();
        await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

        await page.getByRole('button', { name: 'Delete my account' }).click();
        const dialog = page.getByRole('dialog', { name: 'Delete my account' });
        await dialog.getByRole('button', { name: 'Delete my account' }).click();
        await expect(dialog.getByRole('alert')).toBeVisible();
        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      });
    });
  }
});

/** A machine in the JSON of the file download. */
function machineJson(name: string) {
  return {
    format: 'computable/machine@1',
    name,
    tape: 'one-sided',
    blank: '_',
    start: 'q0',
    accept: ['qA'],
    reject: [],
    input: '1',
    rules: [{ state: 'q0', read: '1', write: '0', move: 'R', next: 'qA' }],
  };
}

/** A row with a saved machine, and saved quiz scores when given. */
function savedRow(name: string, progress: object = {}): FakeRow {
  return { machine: machineJson(name), machine_changed_at: '2026-11-24T18:30:00.000Z', progress };
}

/** The browser machine of an earlier visit: the simulator keeps it as indented JSON. */
const browserMachine = (name: string) => ({
  'computable.machine': `${JSON.stringify(machineJson(name), null, 2)}\n`,
  'computable.machine.changedAt': '2026-11-25T08:00:00.000Z',
});

/** The machine name in the simulator's title. */
const machineTitle = (page: Page) => page.getByRole('main').getByRole('heading', { level: 1 });

/** Changes the machine name in the simulator's "Machine file" section. */
async function renameMachine(page: Page, name: string) {
  await page.getByText('Machine file', { exact: true }).click();
  await page.getByRole('textbox', { name: 'Name', exact: true }).fill(name);
}

test.describe('the sync, with Supabase values (spec R5b 5)', () => {
  test.use({ baseURL: `http://localhost:${ACCOUNTS_PORT}` });

  test('an empty browser takes the saved machine', async ({ page }) => {
    await signInBeforeLoad(page);
    const { unexpected, writes } = await fakeSupabase(page, {}, { row: savedRow('Saved one') });
    await openPage(page, '/en/simulator');
    await expect(machineTitle(page)).toHaveText('Saved one');
    expect(writes).toEqual([]);
    expect(unexpected).toEqual([]);
  });

  test('when both machines changed, the dialog asks, and "Use your saved machine" loads it', async ({ page }) => {
    await signInBeforeLoad(page);
    await seedBeforeLoad(page, browserMachine('Mine'));
    const { writes } = await fakeSupabase(page, {}, { row: savedRow('Saved one') });
    await openPage(page, '/en/simulator');
    const dialog = page.getByRole('dialog', { name: 'Which machine do you want to keep?' });
    await expect(dialog.getByRole('group', { name: 'This browser' })).toContainText('Mine');
    await expect(dialog.getByRole('group', { name: 'Your account' })).toContainText('Saved one');
    await dialog.getByRole('button', { name: 'Use your saved machine' }).click();
    await expect(dialog).toBeHidden();
    await expect(machineTitle(page)).toHaveText('Saved one');
    expect(writes).toEqual([]);
  });

  test('"Keep this browser\'s machine" uploads the browser machine', async ({ page }) => {
    await signInBeforeLoad(page);
    await seedBeforeLoad(page, browserMachine('Mine'));
    const { writes } = await fakeSupabase(page, {}, { row: savedRow('Saved one') });
    await openPage(page, '/en/simulator');
    const dialog = page.getByRole('dialog', { name: 'Which machine do you want to keep?' });
    await dialog.getByRole('button', { name: "Keep this browser's machine" }).click();
    await expect(dialog).toBeHidden();
    await expect.poll(() => writes.length).toBe(1);
    expect(writes[0].body).toMatchObject({ machine: { name: 'Mine' }, machine_changed_at: '2026-11-25T08:00:00.000Z' });
    await expect(machineTitle(page)).toHaveText('Mine');
  });

  test('a new machine name goes to the account in 1 write, about 2 seconds later', async ({ page }) => {
    await signInBeforeLoad(page);
    const { writes, unexpected } = await fakeSupabase(page, {});
    await openPage(page, '/en/simulator');
    await expectAccountButton(page, /^Account: /);
    const renamedAt = Date.now();
    await renameMachine(page, 'Renamed');
    await expect.poll(() => writes.length, { timeout: 5000 }).toBe(1);
    expect(writes[0].at - renamedAt).toBeGreaterThanOrEqual(1500);
    expect(writes[0].body).toMatchObject({ machine: { name: 'Renamed' } });
    expect(writes[0].body).not.toHaveProperty('progress');
    // No second write follows.
    await page.waitForTimeout(2500);
    expect(writes).toHaveLength(1);
    expect(unexpected).toEqual([]);
  });

  test('a failed write says the work is not saved, and is safe in this browser', async ({ page }) => {
    const person = await signInBeforeLoad(page);
    const { writes } = await fakeSupabase(page, {}, { writeStatus: 500 });
    await openPage(page, '/en/simulator');
    await expectAccountButton(page, `Account: ${person.name}`);
    await renameMachine(page, 'Renamed');
    await expect.poll(() => writes.length, { timeout: 5000 }).toBe(1);
    await page.getByRole('button', { name: `Account: ${person.name}` }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Not saved' })).toHaveText(
      'Not saved: no connection. Your work is safe in this browser.',
    );
  });

  test('a finished quiz merges with the saved scores, and both show on the Learn page', async ({ page }) => {
    await signInBeforeLoad(page);
    const intuition = { best: 3, total: 5, finishedAt: '2026-11-24T10:00:00.000Z' };
    const { writes } = await fakeSupabase(page, {}, { row: { machine: null, machine_changed_at: null, progress: { intuition } } });
    await openPage(page, '/en/learn/church-turing');
    await expectAccountButton(page, /^Account: /);
    // The right option of each question in lesson 6's quiz (content/lessons/church-turing/quiz.ts).
    for (const [index, right] of [1, 2, 0, 1, 2].entries()) {
      const group = page.getByRole('group', { name: new RegExp(`^Question ${index + 1} of 5`) });
      await group.getByRole('radio').nth(right).check();
      await group.getByRole('button', { name: 'Check' }).click();
    }
    await page.getByRole('navigation', { name: 'Lessons' }).getByRole('link', { name: 'All lessons' }).click();
    const row = (title: string) => page.getByRole('listitem').filter({ has: page.getByRole('link', { name: title }) });
    await expect(row('Intuition: the human computer').getByText('Quiz: 3 of 5')).toBeVisible();
    await expect(row('The Church–Turing thesis').getByText('Quiz: 5 of 5')).toBeVisible();
    await expect.poll(() => writes.length, { timeout: 5000 }).toBe(1);
    expect(writes[0].body).toMatchObject({ progress: { intuition, 'church-turing': { best: 5, total: 5 } } });
    expect(writes[0].body).not.toHaveProperty('machine');
  });

  for (const colorScheme of ['light', 'dark'] as const) {
    test.describe(`${colorScheme} mode`, () => {
      test.use({ colorScheme });

      test('the machine dialog and the menu with the status line have no axe violations', async ({ page }) => {
        const person = await signInBeforeLoad(page);
        await seedBeforeLoad(page, browserMachine('Mine'));
        await fakeSupabase(page, {}, { row: savedRow('Saved one') });
        await openPage(page, '/en/simulator');
        const dialog = page.getByRole('dialog', { name: 'Which machine do you want to keep?' });
        await expect(dialog).toBeVisible();
        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

        await dialog.getByRole('button', { name: 'Use your saved machine' }).click();
        await page.getByRole('button', { name: `Account: ${person.name}` }).click();
        await expect(page.getByRole('status').filter({ hasText: 'Saved to your account' })).toBeVisible();
        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      });
    });
  }
});
