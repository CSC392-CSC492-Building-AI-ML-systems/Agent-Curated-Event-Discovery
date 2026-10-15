import { test, expect } from '@playwright/test';
const url="http://localhost:5173/"
test('Click all buttons and inputs', async ({ page }) => {
  await page.goto(`${url}`);
  await page.getByLabel('Dates Next 7 daysNext 30').selectOption('all');
  await page.getByLabel('Dates Next 7 daysNext 30').selectOption('all-dates');
  await page.getByLabel('Sort by UpcomingTitle A–Z').selectOption('title');
  await page.getByLabel('Sort by UpcomingTitle A–Z').selectOption('upcoming');
  await page.getByText('List').click();
  await page.getByRole('link', { name: 'Map' }).click();
  await page.getByLabel('Dates').selectOption('Next 7 days');
  await page.getByLabel('Dates').selectOption('Next 30 days');
  await page.getByLabel('Sort by').selectOption('Upcoming');
  await page.getByLabel('Sort by').selectOption('Title A–Z');
  await page.getByRole('textbox', { name: 'Search events' }).click();
  await page.getByRole('textbox', { name: 'Search events' }).fill('');
  await page.getByRole('button', { name: 'Search' }).click();
  await page.getByRole('button', { name: 'Close event list' }).click();
  await page.getByRole('textbox', { name: 'Search events' }).click();
  await page.getByRole('textbox', { name: 'Search events' }).fill('asdfasdfasfd');
  await page.getByRole('button', { name: 'Clear search' }).click();
  await page.getByRole('link', { name: 'eventide' }).click();
});