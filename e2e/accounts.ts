import { expect, type Page, type Route } from '@playwright/test';

/**
 * The second server of the end-to-end tests. It runs a build with fake Supabase values, so the
 * account menu shows. The normal build, on the first server, has no values and no account menu.
 */
export const ACCOUNTS_PORT = 4319;

/** The ".invalid" name never resolves, so a request that a test forgot to fake cannot reach the internet. */
export const FAKE_SUPABASE_URL = 'https://computable-e2e.supabase.invalid';
export const FAKE_SUPABASE_KEY = 'e2e-public-key';

/** The key under which supabase-js keeps the session: "sb-", the first part of the host name, and "-auth-token". */
const SESSION_KEY = 'sb-computable-e2e-auth-token';

/** The answer of the fake Supabase to one request. */
type Answer = (route: Route, url: URL) => Promise<void>;

/**
 * Fakes every request to Supabase. `answers` maps "METHOD /path" to an answer. A request with no
 * answer is aborted and recorded, so the test can check that nothing unexpected went out.
 */
export async function fakeSupabase(page: Page, answers: Record<string, Answer>) {
  const unexpected: string[] = [];
  await page.route(`${FAKE_SUPABASE_URL}/**`, async (route) => {
    const url = new URL(route.request().url());
    const answer = answers[`${route.request().method()} ${url.pathname}`];
    if (answer === undefined) {
      unexpected.push(`${route.request().method()} ${url.pathname}`);
      await route.abort();
      return;
    }
    await answer(route, url);
  });
  return { unexpected };
}

/** The person of the fake session. The email domain is reserved for tests. */
const PERSON = { id: '00000000-0000-4000-a000-00000000000a', email: 'ada@example.test', name: 'Ada Lovelace' };

/** A token in the JWT shape. Nothing checks its signature in these tests. */
function fakeToken(expiresAt: number) {
  const part = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${part({ alg: 'HS256', typ: 'JWT' })}.${part({ sub: PERSON.id, role: 'authenticated', exp: expiresAt })}.e2e`;
}

/** Puts a signed-in session in localStorage before the page loads, as supabase-js does after a sign-in. */
export async function signInBeforeLoad(page: Page) {
  const expiresAt = Math.floor(Date.now() / 1000) + 3600;
  const session = {
    access_token: fakeToken(expiresAt),
    refresh_token: 'e2e-refresh-token',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: expiresAt,
    user: {
      id: PERSON.id,
      aud: 'authenticated',
      role: 'authenticated',
      email: PERSON.email,
      app_metadata: { provider: 'github', providers: ['github'] },
      user_metadata: { full_name: PERSON.name },
      created_at: '2026-11-24T00:00:00Z',
    },
  };
  await page.addInitScript(
    ([key, value]) => {
      // Only on the first load: a sign-out must stay signed out after a reload.
      if (sessionStorage.getItem('e2e-seeded') === null) {
        localStorage.setItem(key, value);
        sessionStorage.setItem('e2e-seeded', '1');
      }
    },
    [SESSION_KEY, JSON.stringify(session)] as const,
  );
  return PERSON;
}

/** Waits until the account menu has loaded: it loads after the rest of the menu bar. */
export async function expectAccountButton(page: Page, name: string | RegExp) {
  await expect(page.getByRole('banner').getByRole('button', { name })).toBeVisible();
}
