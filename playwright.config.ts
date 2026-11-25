import { defineConfig, devices } from '@playwright/test';
import { ACCOUNTS_PORT, FAKE_SUPABASE_KEY, FAKE_SUPABASE_URL } from './e2e/accounts';

/** The port of the production server that the end-to-end tests run against. */
const PORT = 4318;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    // Run `npm run build` first: the tests check the production build, as Vercel serves it.
    {
      command: `npx next start -p ${PORT}`,
      url: `http://localhost:${PORT}/en/simulator`,
      reuseExistingServer: !process.env.CI,
    },
    // The account tests need a build with Supabase values. Next.js writes them into the code at
    // build time, so this server builds its own copy into .next/e2e-accounts, then starts it.
    // The values are fake, and e2e/accounts.spec.ts fakes every Supabase request.
    {
      command: `npx next build && npx next start -p ${ACCOUNTS_PORT}`,
      url: `http://localhost:${ACCOUNTS_PORT}/en/about`,
      env: {
        COMPUTABLE_DIST_DIR: '.next/e2e-accounts',
        NEXT_PUBLIC_SUPABASE_URL: FAKE_SUPABASE_URL,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: FAKE_SUPABASE_KEY,
      },
      timeout: 300_000,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
