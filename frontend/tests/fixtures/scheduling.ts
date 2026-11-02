import type { BrowserContext, Page } from "@playwright/test";
import type { ApiEvent } from "../../src/api/types";

const TEST_TIME = new Date("2026-11-01T12:00:00Z");

export function makeEvent(id: number, overrides: Partial<ApiEvent> = {}): ApiEvent {
  return {
    id,
    name: `Event ${id} ${"Long event title ".repeat(12)}`,
    description: "Test event",
    startdate: "2026-11-03",
    enddate: "2026-11-03",
    starttime: "10:00:00",
    endtime: "12:00:00",
    price: 0,
    link: "https://example.com",
    eighteenplus: false,
    tags: [],
    organizer: null,
    venue: { id: 1, name: "Test venue", address: "Toronto", coordinates: null },
    likes: 0,
    saves: 0,
    ...overrides,
  };
}

export async function setupScheduling(page: Page, context: BrowserContext) {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const expires = Math.floor(TEST_TIME.getTime() / 1000) + 3600;
  const user = {
    id: "00000000-0000-4000-8000-000000000001",
    aud: "authenticated",
    role: "authenticated",
    email: "test@example.com",
    app_metadata: {},
    user_metadata: {},
    identities: [],
    created_at: TEST_TIME.toISOString(),
  };
  const session = {
    access_token: `${encode({ alg: "HS256" })}.${encode({ sub: user.id, exp: expires })}.test`,
    refresh_token: "test",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: expires,
    user,
  };
  await page.clock.install({ time: TEST_TIME });
  await context.addCookies([{
    name: "sb-onboarding-test-auth-token",
    value: `base64-${encode(session)}`,
    url: "http://127.0.0.1:5178",
    sameSite: "Lax",
  }]);

  const state = {
    events: Array.from({ length: 7 }, (_, i) => makeEvent(i + 1, {
      endtime: i === 6 ? null : "12:00:00",
    })),
    saved: new Set([1]),
    failSave: false,
  };
  await page.route("**/test-api/**", async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace("/test-api", "");
    if (path === "/events") return route.fulfill({ json: state.events });
    if (path === "/tags" || path === "/users/me/likes") {
      return route.fulfill({ json: [] });
    }
    if (path === "/users/me/saves") {
      return route.fulfill({ json: state.events.filter(event => state.saved.has(event.id)) });
    }
    if (path === "/users/me/preferences") {
      return route.fulfill({ json: {
        age_group: null,
        budget: null,
        interest_tag_ids: [],
        onboarding_completed: false,
      } });
    }
    if (path === "/users/me/save") {
      if (state.failSave) {
        return route.fulfill({ status: 500, json: { detail: "Save failed" } });
      }
      const { id } = request.postDataJSON();
      if (request.method() === "DELETE") state.saved.delete(id);
      else state.saved.add(id);
      return route.fulfill({ json: { id, message: "Success" } });
    }
    return route.fulfill({ status: 404 });
  });
  return state;
}
