import { test, expect } from '@playwright/test';
const url="http://localhost:5173/"
test('Has title "Eventide"', async ({ page }) => {
  await page.goto(`${url}`);

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/Eventide/);
});

test('Goes to Your Events link', async ({ page }) => {
  await page.goto(`${url}`);

  // Click the get started link.
  await page.getByRole('link', { name: 'Your Events' }).click();

  // Expects page to have a heading with the name of Installation.
  await expect(page.getByRole('button', { name: 'Calendar View' })).toBeVisible();
});
