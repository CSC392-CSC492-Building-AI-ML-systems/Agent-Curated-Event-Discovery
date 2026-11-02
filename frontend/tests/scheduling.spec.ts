import { test, expect } from "@playwright/test";
import { findEventConflicts } from "../src/utils/eventConflicts";
const timed = (id: number, startDate: string, endDate: string) => ({ id, startDate, endDate, startTimeKnown: true, endTimeKnown: true });
test("overlap handles containment, boundaries, unknown times, offsets and overnight events", () => {
  const event = timed(1, "2026-11-03T10:00:00-05:00", "2026-11-03T12:00:00-05:00");
  const others = [timed(2, "2026-11-03T16:00:00Z", "2026-11-03T18:00:00Z"), timed(3, "2026-11-03T14:00:00Z", "2026-11-03T19:00:00Z"), timed(4, "2026-11-03T17:00:00Z", "2026-11-03T18:00:00Z"), { ...event, id: 5, endTimeKnown: false }, { ...event, id: 6, endDate: "invalid" }, { ...event, id: 7, endDate: event.startDate }, event];
  expect(findEventConflicts(event, others).map(item => item.id)).toEqual([2, 3]);
  expect(findEventConflicts({ ...event, startTimeKnown: false }, others)).toEqual([]);
  expect(findEventConflicts(timed(8, "2026-11-03T23:00:00-05:00", "2026-11-04T02:00:00-05:00"), [timed(9, "2026-11-04T01:00:00-05:00", "2026-11-04T03:00:00-05:00")])).toHaveLength(1);
});
test("successful saves stack three warnings, truncate titles and expire; failed saves do not warn", async ({ page, context }) => {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const expiry = Math.floor(Date.now() / 1000) + 3600;
  const user = { id: "00000000-0000-4000-8000-000000000001", aud: "authenticated", role: "authenticated", email: "test@example.com", app_metadata: {}, user_metadata: {}, identities: [], created_at: new Date().toISOString() };
  const session = { access_token: `${encode({ alg: "HS256" })}.${encode({ sub: user.id, exp: expiry })}.test`, refresh_token: "test", token_type: "bearer", expires_in: 3600, expires_at: expiry, user };
  await context.addCookies([{ name: "sb-onboarding-test-auth-token", value: `base64-${encode(session)}`, url: "http://127.0.0.1:5178", sameSite: "Lax" }]);
  const events = Array.from({ length: 7 }, (_, i) => ({ id: i + 1, name: `Event ${i + 1} ${"Long event title ".repeat(12)}`, description: "Test event", startdate: "2026-11-03", enddate: "2026-11-03", starttime: "10:00:00", endtime: i === 6 ? null : "12:00:00", price: 0, link: "https://example.com", eighteenplus: false, tags: [], organizer: null, venue: { id: 1, name: "Test venue", address: "Toronto", coordinates: null }, likes: 0, saves: 0 }));
  const saved = new Set([1]);
  let failSave = false;
  await page.route("**/test-api/**", async route => {
    const path = new URL(route.request().url()).pathname.replace("/test-api", "");
    if (path === "/events") return route.fulfill({ json: events });
    if (path === "/tags" || path === "/users/me/likes") return route.fulfill({ json: [] });
    if (path === "/users/me/saves") return route.fulfill({ json: events.filter(e => saved.has(e.id)) });
    if (path === "/users/me/preferences") return route.fulfill({ json: { age_group: null, budget: null, interest_tag_ids: [], onboarding_completed: false } });
    if (path === "/users/me/save") {
      if (failSave) return route.fulfill({ status: 500, json: { detail: "Save failed" } });
      const { id } = route.request().postDataJSON();
      if (route.request().method() === "DELETE") saved.delete(id); else saved.add(id);
      return route.fulfill({ json: { id, message: "Success" } });
    }
    return route.fulfill({ status: 404 });
  });
  await page.goto("/");
  await page.getByRole("button", { name: `Unsave ${events[0].name}`, exact: true }).waitFor();
  await page.clock.install();
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
  await page.screenshot({ path: test.info().outputPath("conflicts-desktop.png") });
  expect(await bubbles.first().locator(".conflict-event-title").first().evaluate(el => el.scrollWidth > el.clientWidth)).toBe(true);
  const before = await bubbles.allTextContents();
  failSave = true;
  await page.getByRole("button", { name: `Save ${events[5].name}`, exact: true }).click();
  await expect(page.getByText("Could not save event. Please retry later.", { exact: true })).toBeVisible();
  expect(await bubbles.allTextContents()).toEqual(before);
  failSave = false;
  await page.getByRole("button", { name: `Save ${events[6].name}`, exact: true }).click();
  await expect(page.getByRole("button", { name: `Unsave ${events[6].name}`, exact: true })).toBeVisible();
  expect(await bubbles.allTextContents()).toEqual(before);
  await page.setViewportSize({ width: 375, height: 812 });
  const bounds = await bubbles.first().boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(375);
  await page.screenshot({ path: test.info().outputPath("conflicts-mobile.png") });
  await page.clock.runFor(6100);
  await expect(bubbles).toHaveCount(0);
});
