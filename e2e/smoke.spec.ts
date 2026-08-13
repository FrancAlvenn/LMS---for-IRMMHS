import { expect, test } from '@playwright/test';

/**
 * Proves the E2E harness works end to end against a real running app —
 * same spirit as the trivial Vitest example test in
 * src/server/lib/apiResponse.test.ts. Expect this file's homepage
 * assertion to need updating the moment Phase 4 replaces the starter
 * page; that's normal, not a regression.
 */
test.describe('Phase 1 smoke test', () => {
  test('homepage loads', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.ok()).toBeTruthy();
    await expect(page.locator('h1')).toBeVisible();
  });

  test('GET /api/health reports a connected database', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.ok()).toBeTruthy();
    expect(await response.json()).toEqual({
      data: { status: 'ok', dbConnected: true },
      error: null,
    });
  });
});
