import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { ACCOUNTS_PORT, expectAccountButton, fakeSupabase, FAKE_SUPABASE_URL, signInBeforeLoad } from './accounts';
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
