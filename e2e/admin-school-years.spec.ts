import { expect, test } from '@playwright/test';

import { loginAsE2ETestUser } from './helpers/auth';

/**
 * Prompt 2.6 acceptance check: the bare admin page lists school years and
 * shows the currently active one. Assumes `npm run seed` has been run
 * against the target DB (SY 2026-2027, active) — same assumption the
 * smoke test makes about /api/health being reachable.
 *
 * As of Phase 3, /admin/** is auth-gated (see auth.spec.ts for the
 * unauthenticated-redirect case) — this spec needs a logged-in session.
 */
test.describe('Admin: school years', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!process.env.E2E_TEST_PASSWORD, 'E2E_TEST_PASSWORD not set — see .env.example');
    await loginAsE2ETestUser(page);
  });

  test('lists the seeded school year as active', async ({ page }) => {
    const response = await page.goto('/admin/school-years');
    expect(response?.ok()).toBeTruthy();

    const row = page.getByRole('row', { name: /2026-2027/ });
    await expect(row).toBeVisible();
    await expect(row).toContainText('active');

    // The active row has no Activate button — activating it again is a no-op
    // the UI shouldn't offer.
    await expect(row.getByRole('button', { name: 'Activate' })).toHaveCount(0);
  });
});
