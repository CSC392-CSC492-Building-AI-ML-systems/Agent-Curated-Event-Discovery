import { test, expect } from "@playwright/test";
import { setupScheduling } from "./fixtures/scheduling";

test("create, copy, reopen, disable and re-enable a private subscription", async ({ page, context }) => {
  const state = await setupScheduling(page, context);
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/calendar");
  await page.getByRole("button", { name: "Subscribe to calendar", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Subscribe to your calendar" });
  await expect(dialog.getByRole("button", { name: "Enable subscription", exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "Enable subscription", exact: true }).click();
  const input = dialog.getByLabel("Private subscription link", { exact: true });
  await expect(input).toHaveValue(/\/calendar\/feeds\/.+\/eventide-events\.ics$/);
  const firstLink = await input.inputValue();
  await dialog.getByRole("button", { name: "Copy link", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "Copied!", exact: true })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(firstLink);
  await expect(dialog.getByText("Copy this link now. It is shown once when the subscription is enabled.", { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Subscribe to calendar", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "Disable subscription", exact: true })).toBeVisible();
  await expect(dialog.getByLabel("Private subscription link", { exact: true })).toHaveCount(0);
  expect(state.subscriptionRequests.filter(method => method === "POST")).toHaveLength(1);
  await dialog.getByRole("button", { name: "Disable subscription", exact: true }).click();
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  expect(state.subscription.enabled).toBe(true);
  await expect(dialog.getByRole("button", { name: "Replace link", exact: true })).toHaveCount(0);
  expect(state.subscriptionRequests.filter(method => method === "POST")).toHaveLength(1);
  await dialog.getByRole("button", { name: "Disable subscription", exact: true }).click();
  await dialog.getByRole("button", { name: "Confirm disable", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "Enable subscription", exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "Enable subscription", exact: true }).click();
  await expect(input).not.toHaveValue(firstLink);
  await expect(input).toHaveValue(/\/calendar\/feeds\/.+\/eventide-events\.ics$/);
  await page.setViewportSize({ width: 375, height: 812 });
  const bounds = await dialog.boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(375);
  await page.screenshot({ path: test.info().outputPath("subscription-mobile.png") });
  await dialog.getByRole("button", { name: "Disable subscription", exact: true }).click();
  await dialog.getByRole("button", { name: "Confirm disable", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "Enable subscription", exact: true })).toBeVisible();
  await expect(input).toHaveCount(0);
  expect(state.subscription.enabled).toBe(false);
});

test("subscription read and write failures are retryable without discarding an active link", async ({ page, context }) => {
  const state = await setupScheduling(page, context);
  state.failSubscriptionRead = true;
  await page.goto("/calendar");
  await page.getByRole("button", { name: "Subscribe to calendar", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("alert")).toContainText("Subscription unavailable");
  state.failSubscriptionRead = false;
  await dialog.getByRole("button", { name: "Retry subscription", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "Enable subscription", exact: true })).toBeVisible();
  state.failSubscriptionWrite = true;
  await dialog.getByRole("button", { name: "Enable subscription", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("Subscription update failed");
  expect(state.subscription.enabled).toBe(false);
  state.failSubscriptionWrite = false;
  await dialog.getByRole("button", { name: "Enable subscription", exact: true }).click();
  const input = dialog.getByLabel("Private subscription link", { exact: true });
  await expect(input).toBeVisible();
  const original = await input.inputValue();
  state.failSubscriptionWrite = true;
  await dialog.getByRole("button", { name: "Disable subscription", exact: true }).click();
  await dialog.getByRole("button", { name: "Confirm disable", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("Subscription update failed");
  await expect(input).toHaveValue(original);
  expect(state.subscription.enabled).toBe(true);
  state.failSubscriptionWrite = false;
  await dialog.getByRole("button", { name: "Confirm disable", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "Enable subscription", exact: true })).toBeVisible();
});

test("clipboard failures leave a selectable link for manual copying", async ({ page, context }) => {
  await setupScheduling(page, context);
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", { value: {
      writeText: async () => { throw new Error("Clipboard blocked"); },
    } });
  });
  await page.goto("/calendar");
  await page.getByRole("button", { name: "Subscribe to calendar", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Enable subscription", exact: true }).click();
  await dialog.getByRole("button", { name: "Copy link", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("copy it manually");
  const input = dialog.getByLabel("Private subscription link", { exact: true });
  await input.focus();
  expect(await input.evaluate((el: HTMLInputElement) => el.selectionStart === 0 && el.selectionEnd === el.value.length)).toBe(true);
});
