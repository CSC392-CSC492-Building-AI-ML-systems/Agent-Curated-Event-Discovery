import { test, expect } from "@playwright/test";
import { setupScheduling } from "./fixtures/scheduling";

const slotName = (day: string, start: string, end: string) => `${day}, ${start} to ${end}`;

test("profile shortcuts open the calendar and availability, and dragging paints and clears a range", async ({ page, context }) => {
  await setupScheduling(page, context);
  await page.goto("/profile");
  const navigation = page.getByRole("navigation", { name: "Profile navigation" });
  await navigation.getByRole("link", { name: "Your Calendar", exact: true }).click();
  await expect(page).toHaveURL(/\/calendar$/);
  await page.goto("/profile");
  await navigation.getByRole("link", { name: "Availability", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Availability", exact: true })).toBeVisible();
  const start = page.getByRole("button", { name: slotName("Monday", "9:00 a.m.", "9:30 a.m."), exact: true });
  const end = page.getByRole("button", { name: slotName("Wednesday", "10:00 a.m.", "10:30 a.m."), exact: true });
  await start.evaluate(element => element.scrollIntoView({ block: "center" }));
  const a = (await start.boundingBox())!;
  const b = (await end.boundingBox())!;
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect(page.locator('.availability-slot[aria-pressed="true"]')).toHaveCount(9);
  await page.screenshot({ path: test.info().outputPath("availability-desktop.png") });
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect(page.locator('.availability-slot[aria-pressed="true"]')).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Clear all", exact: true })).toBeDisabled();
});

test("keyboard selection works and Escape cancels a drag without losing previous choices", async ({ page, context }) => {
  await setupScheduling(page, context);
  await page.goto("/profile/availability");
  const start = page.getByRole("button", { name: slotName("Monday", "9:00 a.m.", "9:30 a.m."), exact: true });
  await start.focus();
  await page.keyboard.press("Space");
  await expect(start).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("ArrowRight");
  const next = page.getByRole("button", { name: slotName("Tuesday", "9:00 a.m.", "9:30 a.m."), exact: true });
  await expect(next).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(next).toHaveAttribute("aria-pressed", "true");
  const bounds = (await start.boundingBox())!;
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.down();
  await expect(start).toHaveAttribute("aria-pressed", "false");
  await page.keyboard.press("Escape");
  await page.mouse.up();
  await expect(page.locator('.availability-slot[aria-pressed="true"]')).toHaveCount(2);
  await page.getByRole("button", { name: "Clear all", exact: true }).click();
  await expect(page.locator('.availability-slot[aria-pressed="true"]')).toHaveCount(0);
});

test.describe("touch layout", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });
  test("slots can be tapped and the grid scrolls within the profile panel", async ({ page, context }) => {
    await setupScheduling(page, context);
    await page.goto("/profile/availability");
    const alignment = await page.locator(".availability-hour").evaluateAll(rows => rows.map(row => {
      const label = row.querySelector("th > span")!.getBoundingClientRect();
      const slot = row.querySelector("button")!.getBoundingClientRect();
      return Math.abs(label.top + label.height / 2 - slot.top);
    }));
    alignment.forEach(offset => expect(offset).toBeLessThan(1));
    const slot = page.getByRole("button", { name: slotName("Sunday", "12:00 a.m.", "12:30 a.m."), exact: true });
    await slot.tap();
    await expect(slot).toHaveAttribute("aria-pressed", "true");
    await slot.tap();
    await expect(slot).toHaveAttribute("aria-pressed", "false");
    const headers = page.locator(".availability-table thead th");
    const before = await headers.evaluateAll(elements => elements.map(element => element.getBoundingClientRect().top));
    await page.locator(".availability-scroll").evaluate(element => { element.scrollTop = 240; });
    const after = await headers.evaluateAll(elements => elements.map(element => element.getBoundingClientRect().top));
    after.forEach((top, index) => expect(Math.abs(top - before[index])).toBeLessThan(0.5));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: test.info().outputPath("availability-mobile.png") });
  });
});

test("schedule ranges save, survive reload, update and clear without tracking interaction", async ({ page, context }) => {
  const state = await setupScheduling(page, context);
  await page.goto("/profile/availability");
  const first = page.getByRole("button", { name: slotName("Monday", "9:00 a.m.", "9:30 a.m."), exact: true });
  await first.waitFor();
  const panel = page.locator(".availability-content");
  const initialHeight = (await panel.boundingBox())!.height;
  const save = page.getByRole("button", { name: "Save schedule", exact: true });
  await expect(save).not.toHaveClass(/active/);
  // Reverting a selection should remove the highlight without writing anything.
  await first.click();
  await expect(save).toHaveClass(/active/);
  await first.click();
  await expect(save).not.toHaveClass(/active/);
  await first.focus();
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Space");
  await page.getByRole("button", { name: slotName("Monday", "3:00 p.m.", "3:30 p.m."), exact: true }).click();
  expect(state.availability.size).toBe(0);
  await expect(save).toHaveClass(/active/);
  await page.getByRole("button", { name: "Save schedule", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Schedule saved.");
  await expect(save).not.toHaveClass(/active/);
  expect(Math.abs((await panel.boundingBox())!.height - initialHeight)).toBeLessThan(1);
  const userId = state.availabilityRequests[0].userId;
  expect(state.availability.get(userId)).toEqual({ windows: [
    { day_of_week: 1, start_minute: 540, end_minute: 600 },
    { day_of_week: 1, start_minute: 900, end_minute: 930 },
  ] });
  await page.reload();
  await expect(page.locator('.availability-slot[aria-pressed="true"]')).toHaveCount(3);
  await first.click();
  await page.getByRole("button", { name: "Save schedule", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Schedule saved.");
  await page.reload();
  await expect(first).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator('.availability-slot[aria-pressed="true"]')).toHaveCount(2);
  await page.getByRole("button", { name: "Clear all", exact: true }).click();
  await expect(page.getByRole("status")).toHaveCount(0);
  await page.getByRole("button", { name: "Save schedule", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Schedule saved.");
  expect(state.availability.get(userId)).toEqual({ windows: [] });
  await page.reload();
  await expect(page.getByRole("button", { name: "Save schedule", exact: true })).toBeEnabled();
  await expect(page.locator('.availability-slot[aria-pressed="true"]')).toHaveCount(0);
});

test("load errors require retry; failed saves retain the draft and success waits for the response", async ({ page, context }) => {
  const state = await setupScheduling(page, context);
  state.failAvailabilityRead = true;
  await page.goto("/profile/availability");
  await expect(page.getByRole("alert")).toContainText("Schedule unavailable");
  await expect(page.getByRole("button", { name: "Save schedule", exact: true })).toHaveCount(0);
  state.failAvailabilityRead = false;
  await page.getByRole("button", { name: "Retry availability", exact: true }).click();
  const first = page.getByRole("button", { name: slotName("Sunday", "12:00 a.m.", "12:30 a.m."), exact: true });
  await first.click();
  state.failAvailabilityWrite = true;
  await page.getByRole("button", { name: "Save schedule", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Schedule save failed");
  await expect(first).toHaveAttribute("aria-pressed", "true");
  expect(state.availability.size).toBe(0);
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/test-api/users/me/availability", async route => {
    if (route.request().method() === "PUT") await gate;
    return route.fallback();
  });
  state.failAvailabilityWrite = false;
  await page.getByRole("button", { name: "Retry save", exact: true }).click();
  try {
    await expect(page.getByRole("button", { name: "Save schedule", exact: true })).toBeDisabled();
    await expect(page.getByRole("status")).toHaveText("Saving…");
    await expect(first).toBeDisabled();
    await expect(page.getByText("Schedule saved.", { exact: true })).toHaveCount(0);
  } finally { release(); }
  await expect(page.getByRole("status")).toHaveText("Schedule saved.");
  await expect(first).toBeEnabled();
  await first.click();
  await expect(page.getByText("Schedule saved.", { exact: true })).toHaveCount(0);
});

test("logout removes the draft and another account has its own saved schedule", async ({ page, context }) => {
  const state = await setupScheduling(page, context);
  await page.goto("/profile/availability");
  const first = page.getByRole("button", { name: slotName("Sunday", "12:00 a.m.", "12:30 a.m."), exact: true });
  await first.click();
  await page.getByRole("button", { name: "Save schedule", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Schedule saved.");
  const firstUser = state.availabilityRequests[0].userId;
  // Leave an unsaved second selection; neither it nor the saved schedule may leak.
  await page.getByRole("button", { name: slotName("Monday", "12:00 a.m.", "12:30 a.m."), exact: true }).click();
  await page.getByRole("button", { name: "Log out", exact: true }).click();
  await expect(page.getByRole("link", { name: "Sign Up / Log In", exact: true })).toBeVisible();
  await expect(page.locator(".availability-slot")).toHaveCount(0);
  await page.getByRole("link", { name: "Log in", exact: true }).click();
  await page.getByRole("textbox", { name: "Email address", exact: true }).fill("b@example.com");
  await page.getByLabel("Password", { exact: true }).fill("test-password");
  await page.getByRole("button", { name: /log in/i }).click();
  await expect(page).toHaveURL(/\/profile\/availability$/);
  await expect(page.getByRole("button", { name: "Save schedule", exact: true })).toBeEnabled();
  await expect(page.locator('.availability-slot[aria-pressed="true"]')).toHaveCount(0);
  await page.getByRole("button", { name: slotName("Tuesday", "12:00 a.m.", "12:30 a.m."), exact: true }).click();
  await page.getByRole("button", { name: "Save schedule", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Schedule saved.");
  const secondUser = state.availabilityRequests.at(-1)!.userId;
  expect(secondUser).not.toBe(firstUser);
  expect(state.availability.get(firstUser)).toEqual({ windows: [{ day_of_week: 0, start_minute: 0, end_minute: 30 }] });
  expect(state.availability.get(secondUser)).toEqual({ windows: [{ day_of_week: 2, start_minute: 0, end_minute: 30 }] });
  await page.reload();
  await expect(first).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator('.availability-slot[aria-pressed="true"]')).toHaveCount(1);
});

test("keyboard focus stays visible below the sticky day header", async ({ page, context }) => {
  await setupScheduling(page, context);
  await page.goto("/profile/availability");
  await page.getByRole("button", { name: slotName("Sunday", "11:30 p.m.", "12:00 a.m."), exact: true }).focus();
  const firstHour = page.getByRole("button", { name: slotName("Sunday", "1:00 a.m.", "1:30 a.m."), exact: true });
  await firstHour.focus();
  const slot = (await firstHour.boundingBox())!;
  const header = (await page.locator(".availability-table thead").boundingBox())!;
  // Individual sticky cells move separately from the original thead box.
  const headerBottom = await page.locator(".availability-table thead th").evaluateAll(cells =>
    Math.max(...cells.map(cell => cell.getBoundingClientRect().bottom)));
  expect(slot.y).toBeGreaterThanOrEqual(Math.max(header.y, headerBottom));
});
