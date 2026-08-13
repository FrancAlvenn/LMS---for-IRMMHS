import { expect, test } from '@playwright/test';

import { loginAsE2ETestUser } from './helpers/auth';

test.describe('Auth', () => {
  test('unauthenticated visit to an admin page redirects to /login', async ({ page }) => {
    await page.goto('/admin/school-years');
    await expect(page).toHaveURL(/\/login/);
  });

  test('logging in as the E2E test user reaches the admin area', async ({ page }) => {
    test.skip(!process.env.E2E_TEST_PASSWORD, 'E2E_TEST_PASSWORD not set — see .env.example');
    await loginAsE2ETestUser(page);
    await page.goto('/admin/school-years');
    await expect(page.locator('h1')).toHaveText('School years');
  });

  test('a freshly created account is forced to change its password on first login', async ({
    page,
    browser,
  }) => {
    test.skip(!process.env.E2E_TEST_PASSWORD, 'E2E_TEST_PASSWORD not set — see .env.example');
    await loginAsE2ETestUser(page);

    // Create a throwaway admin-provisioned user via the API, reusing the
    // logged-in page's session cookies (page.request shares them).
    const rolesRes = await page.request.get('/api/roles');
    const { data: roles } = (await rolesRes.json()) as { data: { id: string; name: string }[] };
    const adminRole = roles.find((role) => role.name === 'Admin');
    expect(adminRole).toBeTruthy();

    const username = `e2e-fresh-${Date.now()}`;
    const createRes = await page.request.post('/api/users', {
      data: {
        username,
        displayName: 'E2E Fresh User',
        password: 'temporaryPassword123',
        roleId: adminRole?.id,
      },
    });
    expect(createRes.ok()).toBeTruthy();

    // Separate browser context — a fresh, cookie-less "someone else's
    // computer" rather than juggling sign-out on the shared session above.
    const freshContext = await browser.newContext();
    const freshPage = await freshContext.newPage();
    await freshPage.goto('/login');
    await freshPage.getByLabel('Username').fill(username);
    await freshPage.getByLabel('Password').fill('temporaryPassword123');
    await freshPage.getByRole('button', { name: 'Sign in' }).click();
    await expect(freshPage).toHaveURL(/\/change-password/);
    await freshContext.close();
  });
});
