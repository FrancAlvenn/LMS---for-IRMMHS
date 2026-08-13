import { defineConfig, devices } from '@playwright/test';

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
