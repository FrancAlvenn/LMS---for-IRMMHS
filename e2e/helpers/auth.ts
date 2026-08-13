import { expect, type Page } from '@playwright/test';

/**
 * Logs in as the dev/test-only "e2e-test" fixture user (see
 * scripts/seed.ts and .env.example — E2E_TEST_PASSWORD). Call
 * `requireE2ETestPassword()` first so the spec skips itself cleanly when
 * the env var isn't set, instead of failing with a confusing error.
 */
export function requireE2ETestPassword(): string {
  const password = process.env.E2E_TEST_PASSWORD;
  if (!password) {
    throw new Error('E2E_TEST_PASSWORD not set — the calling spec should have skipped itself.');
  }
  return password;
}

export async function loginAsE2ETestUser(page: Page): Promise<void> {
  const password = requireE2ETestPassword();
  await page.goto('/login');
  await page.getByLabel('Username').fill('e2e-test');
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).not.toHaveURL(/\/login/);
}
