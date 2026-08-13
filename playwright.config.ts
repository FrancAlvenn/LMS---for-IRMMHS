import { defineConfig, devices } from '@playwright/test';

// Unlike the Next.js app itself, the Playwright test runner doesn't load
// .env.local automatically — tests that need E2E_TEST_PASSWORD (see
// e2e/helpers/auth.ts) need it in this process's env too. Missing file
// (e.g. CI without secrets) is fine; those specs skip themselves.
try {
  process.loadEnvFile('.env.local');
} catch {
  // no .env.local — fine, see above
}

/**
 * E2E tests live in e2e/, separate from the Vitest unit tests colocated
 * under src/**\/*.test.ts. Vitest covers pure logic (the grading engine,
 * validators); Playwright covers real browser flows against a running app.
 *
 * Only Chromium is installed for now (`npx playwright install chromium`) —
 * it covers both the desktop-registrar and Android-teacher-on-a-phone
 * cases via the two projects below. Add firefox/webkit projects later if
 * a cross-browser bug ever actually surfaces; no need to pay for it
 * upfront. See CLAUDE.md.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  // Capped at 1, not left to Playwright's CPU-count default: bcryptjs
  // (chosen for zero native-build risk — see CLAUDE.md) hashes
  // synchronously enough that several concurrent logins against a single
  // `next dev` process reliably starve the event loop past Playwright's
  // default timeouts, producing flaky failures that don't reproduce
  // against a real deployment (verified by hand — see Phase 3 decision
  // log). Revisit once E2E runs against a production build instead of
  // `next dev`, or the login-heavy specs get their own isolated fixtures.
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'Desktop Chrome',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile Chrome',
      // The registrar works a desktop; teachers encode grades on Android
      // phones on bad school Wi-Fi. This project is the one that matters
      // most once Phase 11 (grade entry UX) exists.
      use: { ...devices['Pixel 7'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
