import { test, expect } from "@playwright/test";
import { makeEvent, setupScheduling } from "./fixtures/scheduling";

test("conflict warnings stack, truncate, expire and only follow successful saves", async ({ page, context }) => {
  const state = await setupScheduling(page, context);
  const { events, calendar } = state;
  await page.goto("/");
  await page.getByRole("button", { name: `Unsave ${events[0].name}`, exact: true }).waitFor();
  const bubbles = page.locator(".conflict-bubble");

  for (const event of events.slice(1, 5)) {
    await page.getByRole("button", { name: `Add to calendar: ${event.name}`, exact: true }).click();
    await expect(bubbles.first()).toContainText(event.name);
    expect(calendar.has(event.id)).toBe(true);
  }
  await expect(bubbles).toHaveCount(3);
  await expect(bubbles.first()).toContainText("conflicts with");
  await expect(bubbles.first()).toContainText("+3 more");
  await expect(bubbles.nth(1)).toContainText(events[3].name);
  await page.clock.runFor(500);
  const title = bubbles.first().locator(".conflict-event-title").first();
  expect(await title.evaluate(el => el.scrollWidth > el.clientWidth)).toBe(true);
  const before = await bubbles.allTextContents();

  state.failCalendar = true;
  await page.getByRole("button", { name: `Add to calendar: ${events[5].name}`, exact: true }).click();
  await expect(page.getByText("Calendar update failed. Please retry.", { exact: true })).toBeVisible();
  expect(await bubbles.allTextContents()).toEqual(before);

  state.failCalendar = false;
  await page.getByRole("button", { name: `Add to calendar: ${events[6].name}`, exact: true }).click();
  await expect(page.getByRole("button", { name: `Remove from calendar: ${events[6].name}`, exact: true })).toBeVisible();
  expect(await bubbles.allTextContents()).toEqual(before);

  await page.setViewportSize({ width: 375, height: 812 });
  const bounds = await bubbles.first().boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(375);
  await page.clock.runFor(6100);
  await expect(bubbles).toHaveCount(0);
});

test("calendar downloads all calendar dates, excludes undated events and handles an empty calendar", async ({ page, context }) => {
  const state = await setupScheduling(page, context);
  state.events = [
    makeEvent(1),
    makeEvent(2, { starttime: null, endtime: null }),
    makeEvent(3, { startdate: null, starttime: null }),
    makeEvent(4),
  ];
  state.calendar = new Set([1, 2, 3]);
  state.saved = new Set([4]);
  await page.goto("/calendar");
  await expect(page.getByRole("link", { name: "Your Events (1)", exact: true })).toBeVisible();
  const exportBounds = await page.getByRole("button", { name: "Export events", exact: true }).boundingBox();
  const previousBounds = await page.getByRole("button", { name: "Previous month", exact: true }).boundingBox();
  expect(exportBounds!.x).toBeLessThan(previousBounds!.x);
  await page.getByRole("button", { name: "Next month", exact: true }).click();
  // Export includes events outside the month currently on screen.
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export events", exact: true }).click();
  const download = await downloaded;
  expect(download.suggestedFilename()).toBe("eventide-events.ics");
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  const calendar = Buffer.concat(chunks).toString("utf8");
  expect(calendar.match(/BEGIN:VEVENT/g)).toHaveLength(2);
  expect(calendar).toContain("UID:event-1@eventide");
  expect(calendar).toContain("DTSTART:20261103T150000Z");
  expect(calendar).toContain("DTSTART;VALUE=DATE:20261103");
  expect(calendar).not.toContain("UID:event-3@eventide");
  expect(calendar).not.toContain("UID:event-4@eventide");
  await expect(page.getByRole("status").filter({ hasText: "1 calendar event was excluded" })).toBeVisible();

  state.calendar.clear();
  await page.reload();
  await expect(page.getByRole("button", { name: "Export events", exact: true })).toBeDisabled();
});


test("saving and calendar actions stay independent across reloads and event details", async ({ page, context }) => {
  const state = await setupScheduling(page, context);
  state.saved.clear();
  state.calendar.clear();
  const [first, second] = state.events;
  await page.goto("/");
  await page.getByRole("button", { name: `Save ${first.name}`, exact: true }).click();
  await expect(page.getByRole("button", { name: `Unsave ${first.name}`, exact: true })).toBeVisible();
  expect(state.calendar.size).toBe(0);
  await expect(page.locator(".conflict-bubble")).toHaveCount(0);

  await page.getByRole("button", { name: `Add to calendar: ${first.name}`, exact: true }).click();
  await expect(page.getByRole("button", { name: `Remove from calendar: ${first.name}`, exact: true })).toBeVisible();
  await page.getByRole("button", { name: `Unsave ${first.name}`, exact: true }).click();
  await expect(page.getByRole("button", { name: `Save ${first.name}`, exact: true })).toBeVisible();
  expect(state.calendar.has(first.id)).toBe(true);
  await page.reload();
  await expect(page.getByRole("button", { name: `Remove from calendar: ${first.name}`, exact: true })).toBeVisible();
  expect(state.saved.size).toBe(0);

  await page.getByRole("button", { name: `View ${second.name}`, exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.locator(".event-date")).toContainText("Tue, Nov 3");
  await expect(dialog.locator(".event-date")).toContainText("10:00");
  await expect(dialog.locator(".event-date")).not.toContainText("2026-11-03T");
  const calendarIcon = dialog.getByRole("button", { name: `Add to calendar: ${second.name}`, exact: true }).locator("svg");
  const saveIcon = dialog.getByRole("button", { name: "Save event", exact: true }).locator("svg");
  expect(await calendarIcon.evaluate(el => getComputedStyle(el).color))
    .toBe(await saveIcon.evaluate(el => getComputedStyle(el).color));
  await dialog.getByRole("button", { name: `Add to calendar: ${second.name}`, exact: true }).click();
  await expect(dialog.getByRole("button", { name: `Remove from calendar: ${second.name}`, exact: true })).toBeVisible();
  expect(state.saved.size).toBe(0);
  await dialog.getByRole("button", { name: `Remove from calendar: ${second.name}`, exact: true }).click();
  await expect(dialog.getByRole("button", { name: `Add to calendar: ${second.name}`, exact: true })).toBeVisible();
  expect(state.calendar.has(second.id)).toBe(false);
});

test("calendar read failures support retry and signed-out calendar actions request login", async ({ page, context }) => {
  const state = await setupScheduling(page, context);
  state.failCalendarRead = true;
  await page.goto("/calendar");
  await expect(page.getByText("Calendar unavailable", { exact: true })).toBeVisible();
  state.failCalendarRead = false;
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.getByRole("button", { name: "Export events", exact: true })).toBeEnabled();
  await context.clearCookies();
  await page.goto("/");
  await page.getByRole("button", { name: `Add to calendar: ${state.events[0].name}`, exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test("calendar day dialog shows independent save controls and can remove calendar entries", async ({ page, context }) => {
  const state = await setupScheduling(page, context);
  state.calendar = new Set([1, 2, 3, 4]);
  state.saved.clear();
  await page.goto("/calendar");
  await page.getByRole("button", { name: "Show all 4 events on 2026-11-03", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("button", { name: `Save ${state.events[0].name}`, exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: `Remove from calendar: ${state.events[0].name}`, exact: true }).click();
  await expect(dialog.getByText("3 calendar events", { exact: true })).toBeVisible();
  expect(state.calendar.has(1)).toBe(false);
  expect(state.saved.size).toBe(0);
});

test("concurrent calendar additions retain both entries and detect their conflict", async ({ page, context }) => {
  const state = await setupScheduling(page, context);
  state.calendar.clear();
  let releaseFirst!: () => void;
  const gate = new Promise<void>(resolve => { releaseFirst = resolve; });
  let firstRequested!: () => void;
  const started = new Promise<void>(resolve => { firstRequested = resolve; });
  await page.route("**/test-api/users/me/calendar", async route => {
    if (route.request().method() !== "PUT" || route.request().postDataJSON().id !== 1) {
      return route.fallback();
    }
    firstRequested();
    await gate;
    state.calendar.add(1);
    return route.fulfill({ json: { id: 1, message: "Success" } });
  });
  await page.goto("/");
  const first = page.getByRole("button", { name: `Add to calendar: ${state.events[0].name}`, exact: true });
  await expect(first).toBeEnabled();
  await first.click();
  await started;
  try {
    await page.getByRole("button", { name: `Add to calendar: ${state.events[1].name}`, exact: true }).click();
    await expect(page.getByRole("button", { name: `Remove from calendar: ${state.events[1].name}`, exact: true })).toBeVisible();
    await expect(page.locator(".conflict-bubble")).toHaveCount(0);
  } finally {
    releaseFirst();
  }
  await expect(page.getByRole("button", { name: `Remove from calendar: ${state.events[0].name}`, exact: true })).toBeVisible();
  await expect(page.locator(".conflict-bubble")).toContainText("conflicts with");
  expect([...state.calendar].sort((a, b) => a - b)).toEqual([1, 2]);
  await page.locator(".event-card").first().screenshot({ path: test.info().outputPath("calendar-action.png") });
});
