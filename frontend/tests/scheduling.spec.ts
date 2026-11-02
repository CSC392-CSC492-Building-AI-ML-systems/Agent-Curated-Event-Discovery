import { test, expect } from "@playwright/test";
import { makeEvent, setupScheduling } from "./fixtures/scheduling";

test("conflict warnings stack, truncate, expire and only follow successful saves", async ({ page, context }) => {
  const state = await setupScheduling(page, context);
  const { events, saved } = state;
  await page.goto("/");
  await page.getByRole("button", { name: `Unsave ${events[0].name}`, exact: true }).waitFor();
  const bubbles = page.locator(".conflict-bubble");

  for (const event of events.slice(1, 5)) {
    await page.getByRole("button", { name: `Save ${event.name}`, exact: true }).click();
    await expect(bubbles.first()).toContainText(event.name);
    expect(saved.has(event.id)).toBe(true);
  }
  await expect(bubbles).toHaveCount(3);
  await expect(bubbles.first()).toContainText("conflicts with");
  await expect(bubbles.first()).toContainText("+3 more");
  await expect(bubbles.nth(1)).toContainText(events[3].name);
  await page.clock.runFor(500);
  const title = bubbles.first().locator(".conflict-event-title").first();
  expect(await title.evaluate(el => el.scrollWidth > el.clientWidth)).toBe(true);
  const before = await bubbles.allTextContents();

  state.failSave = true;
  await page.getByRole("button", { name: `Save ${events[5].name}`, exact: true }).click();
  await expect(page.getByText("Could not save event. Please retry later.", { exact: true })).toBeVisible();
  expect(await bubbles.allTextContents()).toEqual(before);

  state.failSave = false;
  await page.getByRole("button", { name: `Save ${events[6].name}`, exact: true }).click();
  await expect(page.getByRole("button", { name: `Unsave ${events[6].name}`, exact: true })).toBeVisible();
  expect(await bubbles.allTextContents()).toEqual(before);

  await page.setViewportSize({ width: 375, height: 812 });
  const bounds = await bubbles.first().boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(375);
  await page.clock.runFor(6100);
  await expect(bubbles).toHaveCount(0);
});

test("calendar downloads all saved dates, excludes undated events and handles an empty calendar", async ({ page, context }) => {
  const state = await setupScheduling(page, context);
  state.events = [
    makeEvent(1),
    makeEvent(2, { starttime: null, endtime: null }),
    makeEvent(3, { startdate: null, starttime: null }),
    makeEvent(4),
  ];
  state.saved = new Set([1, 2, 3]);
  await page.goto("/calendar");
  await expect(page.getByRole("link", { name: "Your Events (3)", exact: true })).toBeVisible();
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
  await expect(page.getByRole("status").filter({ hasText: "1 saved event was excluded" })).toBeVisible();

  state.saved.clear();
  await page.reload();
  await expect(page.getByRole("button", { name: "Export events", exact: true })).toBeDisabled();
});
