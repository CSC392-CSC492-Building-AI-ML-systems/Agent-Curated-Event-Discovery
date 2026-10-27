import { test, expect } from "@playwright/test";
import type { BrowserContext, Page } from "@playwright/test";

const USER_A = "00000000-0000-4000-8000-000000000001";
const USER_B = "00000000-0000-4000-8000-000000000002";
const COOKIE = "sb-onboarding-test-auth-token";
const emptyPreferences = () => ({ age_group: null, budget: null, interest_tag_ids: [] as number[], onboarding_completed: false });
type Preferences = { age_group: string | null; budget: string | null; interest_tag_ids: number[]; onboarding_completed: boolean };

function session(id = USER_A) {
  const expires = Math.floor(Date.now() / 1000) + 3600;
  const user = { id, aud: "authenticated", role: "authenticated", email: id === USER_A ? "a@example.com" : "b@example.com", app_metadata: {}, user_metadata: {}, identities: [], created_at: new Date().toISOString() };
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const access_token = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: id, exp: expires, aud: "authenticated", role: "authenticated" })}.test-signature`;
  return { access_token, refresh_token: `test-refresh-${id}`, token_type: "bearer", expires_in: 3600, expires_at: expires, user };
}

async function signIn(context: BrowserContext, id = USER_A) {
  await context.addCookies([{
    name: COOKIE, value: `base64-${Buffer.from(JSON.stringify(session(id))).toString("base64url")}`,
    url: "http://127.0.0.1:5178", sameSite: "Lax",
  }]);
}

async function mockBackend(page: Page) {
  const state = {
    profiles: new Map<string, Preferences>(),
    saves: [] as { userId: string; body: Omit<Preferences, "onboarding_completed"> }[],
    failSave: false, failTags: false, failRead: false,
    tags: [{ id: 7, name: "Art" }, { id: 23, name: "Music" }],
  };
  await page.route("https://onboarding-test.supabase.co/auth/v1/**", async route => {
    if (route.request().url().includes("/logout")) return route.fulfill({ status: 204 });
    const data = route.request().postDataJSON();
    return route.fulfill({ json: session(data?.email === "b@example.com" ? USER_B : USER_A) });
  });
  await page.route("**/test-api/**", async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname === "/test-api/events") return route.fulfill({ json: [] });
    if (url.pathname === "/test-api/tags") return state.failTags
      ? route.fulfill({ status: 500, json: { detail: "Interests temporarily unavailable" } })
      : route.fulfill({ json: state.tags });
    if (url.pathname === "/test-api/users/me/preferences") {
      const token = request.headers().authorization?.replace("Bearer ", "");
      if (!token) return route.fulfill({ status: 401, json: { detail: "Missing token" } });
      const userId = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString()).sub as string;
      if (request.method() === "PUT") {
        state.saves.push({ userId, body: request.postDataJSON() });
        // Ensure success cannot be shown before the server confirms the write.
        await new Promise(resolve => setTimeout(resolve, 150));
        if (state.failSave) return route.fulfill({ status: 500, json: { detail: "Save failed. Please retry." } });
        const saved = { ...request.postDataJSON(), onboarding_completed: true };
        state.profiles.set(userId, saved);
        return route.fulfill({ json: saved });
      }
      return state.failRead ? route.fulfill({ status: 500, json: { detail: "Profile temporarily unavailable" } })
        : route.fulfill({ json: state.profiles.get(userId) ?? emptyPreferences() });
    }
    return route.fulfill({ status: 404, json: { detail: "Not found" } });
  });
  return state;
}

async function toInterests(page: Page) {
  await page.getByRole("heading", { name: "What is your age group?" }).waitFor();
  await page.getByText("30–39", { exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByText("Under $25", { exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
}

test("signed-out visitors do not see For You and onboarding asks for login", async ({ page }) => {
  await mockBackend(page);
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Sign Up / Log In" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /For You/ })).toHaveCount(0);
  await page.goto("/onboarding");
  await expect(page.getByRole("heading", { name: "Sign in to personalise your events." })).toBeVisible();
});

test("real tag IDs and stable answers are saved, restored on reload, and editable", async ({ page, context }) => {
  const server = await mockBackend(page);
  await signIn(context);
  await page.goto("/");
  await page.getByRole("link", { name: "Start", exact: true }).click();
  await toInterests(page);
  await expect(page.getByRole("button", { name: "Continue", exact: true })).toBeDisabled();
  await page.getByText("Art", { exact: true }).click();
  await page.getByText("Music", { exact: true }).click();
  await page.clock.install();
  await page.clock.pauseAt(new Date());
  const savedResponse = page.waitForResponse(response => response.url().includes("/users/me/preferences") && response.request().method() === "PUT");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Curating events for you" })).toBeVisible();
  await savedResponse;
  await page.clock.runFor(2999);
  await expect(page.getByRole("heading", { name: "Curation complete!" })).toHaveCount(0);
  await page.clock.runFor(1);
  await expect(page.getByRole("heading", { name: "Curation complete!" })).toBeVisible();
  expect(server.saves).toEqual([{ userId: USER_A, body: { age_group: "30_39", budget: "under_25", interest_tag_ids: [7, 23] } }]);
  await page.getByRole("link", { name: "Explore", exact: true }).click();
  await expect(page.getByRole("link", { name: "Edit preferences" })).toBeVisible();
  await page.reload();
  await page.getByRole("link", { name: "Profile", exact: true }).click();
  await expect(page.locator("main")).toContainText("30–39");
  await expect(page.locator("main")).toContainText("Art, Music");
  await page.getByRole("link", { name: "Edit preferences" }).click();
  await expect(page.getByRole("radio", { name: "30–39", exact: true })).toBeChecked();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByRole("radio", { name: "Under $25", exact: true })).toBeChecked();
});

test("skipped answers submit null and Next preserves navigation", async ({ page, context }) => {
  const server = await mockBackend(page);
  await signIn(context);
  await page.goto("/onboarding");
  await page.getByRole("button", { name: "Skip", exact: true }).click();
  await page.getByRole("button", { name: "← Back" }).click();
  await expect(page.getByRole("button", { name: "Skip", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "Skip", exact: true }).click();
  await page.getByText("Art", { exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Curation complete!" })).toBeVisible();
  expect(server.saves[0].body).toEqual({ age_group: null, budget: null, interest_tag_ids: [7] });
});

test("failed saves retain answers and retry only reports completion after success", async ({ page, context }) => {
  const server = await mockBackend(page);
  server.failSave = true;
  await signIn(context);
  await page.goto("/onboarding");
  await toInterests(page);
  await page.getByText("Art", { exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Save failed");
  await expect(page.getByRole("checkbox", { name: "Art", exact: true })).toBeChecked();
  await expect(page.getByRole("heading", { name: "Curation complete!" })).toHaveCount(0);
  server.failSave = false;
  await page.getByRole("button", { name: "Retry saving" }).click();
  await expect(page.getByRole("heading", { name: "Curation complete!" })).toBeVisible();
  expect(server.saves).toHaveLength(2);
  expect(server.saves[1].body).toEqual(server.saves[0].body);
});

test("logout and a second login do not expose the first account's preferences", async ({ page, context }) => {
  const server = await mockBackend(page);
  server.profiles.set(USER_A, { age_group: "80_plus", budget: "free", interest_tag_ids: [7], onboarding_completed: true });
  await signIn(context);
  await page.goto("/profile");
  await expect(page.locator("main")).toContainText("80+");
  await page.getByRole("button", { name: "Log out", exact: true }).click();
  await expect(page.getByRole("link", { name: "Sign Up / Log In" })).toBeVisible();
  await expect(page.locator("main")).not.toContainText("80+");
  await page.goto("/login");
  await page.getByRole("textbox", { name: "Email address" }).fill("b@example.com");
  await page.getByLabel("Password", { exact: true }).fill("test-password");
  await page.getByRole("button", { name: /log in/i }).click();
  await expect(page.getByRole("link", { name: "Start", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Profile", exact: true }).click();
  await expect(page.locator("main")).toContainText("b@example.com");
  await expect(page.locator("main")).not.toContainText("80+");
  await expect(page.getByRole("link", { name: "Complete onboarding" })).toBeVisible();
});

test("tag failure supports retry and newly available database tags appear", async ({ page, context }) => {
  const server = await mockBackend(page);
  server.failTags = true;
  await signIn(context);
  await page.goto("/onboarding");
  await toInterests(page);
  await expect(page.getByRole("alert")).toContainText("Interests temporarily unavailable");
  server.failTags = false;
  server.tags.push({ id: 55, name: "Photography" });
  await page.getByRole("button", { name: "Retry interests" }).click();
  await expect(page.getByRole("checkbox", { name: "Photography", exact: true })).toBeVisible();
});

test("preference-read errors show retry rather than an incomplete-onboarding prompt", async ({ page, context }) => {
  const server = await mockBackend(page);
  server.failRead = true;
  await signIn(context);
  await page.goto("/");
  await expect(page.getByRole("alert")).toContainText("Profile temporarily unavailable");
  await expect(page.getByRole("link", { name: "Start", exact: true })).toHaveCount(0);
  server.failRead = false;
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.getByRole("link", { name: "Start", exact: true })).toBeVisible();
});
