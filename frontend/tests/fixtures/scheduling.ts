import type { BrowserContext, Page } from "@playwright/test";
import type { WeeklyAvailability } from "../../src/api/availabilityTypes";
import type { ApiEvent } from "../../src/api/types";
import type { UserProfile } from "../../src/api/profile";

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

function schedulingSession(userId = "00000000-0000-4000-8000-000000000001", email = "test@example.com") {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const expires = Math.floor(TEST_TIME.getTime() / 1000) + 3600;
  const user = {
    id: userId,
    aud: "authenticated",
    role: "authenticated",
    email,
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
  return session;
}

export async function setupScheduling(page: Page, context: BrowserContext) {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const session = schedulingSession();
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
    calendar: new Set([1]),
    failCalendar: false,
    failCalendarRead: false,
    subscription: { enabled: false, created_at: null as string | null },
    subscriptionVersion: 0,
    subscriptionRequests: [] as string[],
    failSubscriptionRead: false,
    failSubscriptionWrite: false,
    availability: new Map<string, WeeklyAvailability>(),
    availabilityRequests: [] as { method: string; userId: string; body?: WeeklyAvailability }[],
    failAvailabilityRead: false,
    failAvailabilityWrite: false,
    profiles: new Map<string, UserProfile>(),
    failProfileRead: false,
    failProfileWrite: false,
  };
  await page.route("https://onboarding-test.supabase.co/auth/v1/**", async route => {
    if (route.request().url().includes("/logout")) return route.fulfill({ status: 204 });
    const email = route.request().postDataJSON()?.email;
    return route.fulfill({ json: email === "b@example.com"
      ? schedulingSession("00000000-0000-4000-8000-000000000002", email)
      : schedulingSession() });
  });
  await page.route("**/test-api/**", async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace("/test-api", "");
    if (path === "/users/me/profile") {
      const token = request.headers().authorization?.replace("Bearer ", "");
      if (!token) return route.fulfill({ status: 401 });
      const userId = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString()).sub as string;
      const empty = { first_name: null, last_name: null, username: null, updated_at: null };
      if (request.method() === "GET") return state.failProfileRead
        ? route.fulfill({ status: 500, json: { detail: "Unable to load profile" } })
        : route.fulfill({ json: state.profiles.get(userId) ?? empty });
      if (request.method() !== "PUT") return route.fulfill({ status: 405 });
      if (state.failProfileWrite) return route.fulfill({ status: 500, json: { detail: "Unable to save profile" } });
      const body = request.postDataJSON() as UserProfile;
      if ([...state.profiles].some(([id, profile]) => id !== userId && body.username && body.username === profile.username)) {
        return route.fulfill({ status: 409, json: { detail: "This username is already taken." } });
      }
      const saved = { ...body, updated_at: TEST_TIME.toISOString() };
      state.profiles.set(userId, saved);
      return route.fulfill({ json: saved });
    }
    if (path === "/users/me/availability") {
      const token = request.headers().authorization?.replace("Bearer ", "");
      if (!token) return route.fulfill({ status: 401 });
      const userId = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString()).sub as string;
      const method = request.method();
      const body = method === "PUT" ? request.postDataJSON() as WeeklyAvailability : undefined;
      state.availabilityRequests.push({ method, userId, body });
      if (method === "GET") {
        return state.failAvailabilityRead
          ? route.fulfill({ status: 500, json: { detail: "Schedule unavailable. Please retry." } })
          : route.fulfill({ json: state.availability.get(userId) ?? { windows: [] } });
      }
      if (method !== "PUT") return route.fulfill({ status: 405 });
      if (state.failAvailabilityWrite) return route.fulfill({ status: 500, json: { detail: "Schedule save failed. Please retry." } });
      state.availability.set(userId, structuredClone(body!));
      return route.fulfill({ json: body });
    }
    if (path === "/users/me/calendar-subscription") {
      if (!request.headers().authorization) return route.fulfill({ status: 401 });
      const method = request.method();
      state.subscriptionRequests.push(method);
      if (method === "GET") {
        return state.failSubscriptionRead
          ? route.fulfill({ status: 500, json: { detail: "Subscription unavailable" } })
          : route.fulfill({ json: state.subscription });
      }
      if (state.failSubscriptionWrite) {
        return route.fulfill({ status: 500, json: { detail: "Subscription update failed. Please retry." } });
      }
      if (method === "DELETE") {
        state.subscription = { enabled: false, created_at: null };
        return route.fulfill({ status: 204 });
      }
      state.subscription = { enabled: true, created_at: TEST_TIME.toISOString() };
      const token = String(++state.subscriptionVersion).padStart(43, "x");
      return route.fulfill({ json: {
        ...state.subscription,
        subscription_url: `http://127.0.0.1:5178/test-api/calendar/feeds/${token}/eventide-events.ics`,
      } });
    }
    if (path === "/events") return route.fulfill({ json: state.events });
    if (path === "/tags" || path === "/users/me/likes") {
      return route.fulfill({ json: [] });
    }
    if (path === "/users/me/saves") {
      return route.fulfill({ json: state.events.filter(event => state.saved.has(event.id)) });
    }
    if (path === "/users/me/calendar") {
      if (request.method() === "GET") {
        if (state.failCalendarRead) {
          return route.fulfill({ status: 500, json: { detail: "Calendar unavailable" } });
        }
        const params = new URL(request.url()).searchParams;
        const skip = Number(params.get("skip") ?? 0);
        const limit = Number(params.get("limit") ?? 100);
        const events = state.events.filter(event => state.calendar.has(event.id));
        return route.fulfill({ json: events.slice(skip, skip + limit) });
      }
      if (state.failCalendar) {
        return route.fulfill({ status: 500, json: { detail: "Calendar update failed. Please retry." } });
      }
      const { id } = request.postDataJSON();
      if (request.method() === "DELETE") state.calendar.delete(id);
      else state.calendar.add(id);
      return route.fulfill({ json: { id, message: "Success" } });
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
