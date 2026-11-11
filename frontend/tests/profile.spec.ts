import { test, expect } from "@playwright/test";
import { setupScheduling } from "./fixtures/scheduling";

test("profile layout supports identity editing, cancel and preferences navigation", async ({ page, context }) => {
  await setupScheduling(page, context);
  await page.route("**/test-api/users/me/preferences", route => route.fulfill({ json: {
    age_group: "30_39", budget: "under_25", interest_tag_ids: [], onboarding_completed: true,
  } }));
  await page.goto("/profile");
  await expect(page.getByRole("heading", { name: "Your Profile", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Preferences", exact: true })).toBeVisible();
  await expect(page.locator("main")).toContainText("30–39");
  const navigation = page.getByRole("navigation", { name: "Profile navigation" });
  await expect(navigation.getByRole("link")).toHaveCount(6);
  await expect(navigation.getByRole("button", { name: "Friends (coming soon)", exact: true })).toBeDisabled();
  await page.screenshot({ path: test.info().outputPath("profile-desktop.png") });
  const preferences = page.getByRole("heading", { name: "Preferences", exact: true });
  const preferencesTop = await preferences.evaluate(element => element.getBoundingClientRect().top + window.scrollY);
  const cardHeight = (await page.locator(".profile-settings-content").boundingBox())!.height;
  const edit = page.getByRole("button", { name: "Edit profile", exact: true });
  await edit.click();
  expect(Math.abs(await preferences.evaluate(element => element.getBoundingClientRect().top + window.scrollY) - preferencesTop)).toBeLessThan(1);
  expect(Math.abs((await page.locator(".profile-settings-content").boundingBox())!.height - cardHeight)).toBeLessThan(1);
  await expect(page.getByLabel("First name", { exact: true })).toBeFocused();
  await page.getByLabel("First name", { exact: true }).fill("Jessica");
  await page.getByLabel("Last name", { exact: true }).fill("Lee");
  await page.getByLabel("Username", { exact: true }).fill("  Jessica_Lee  ");
  await page.getByRole("button", { name: "Apply profile changes", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Jessica Lee", exact: true })).toBeVisible();
  await expect(page.locator("main")).toContainText("@jessica_lee");
  await expect(edit).toBeFocused();
  await edit.click();
  await page.getByLabel("First name", { exact: true }).fill("Discard this");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("heading", { name: "Jessica Lee", exact: true })).toBeVisible();
  await edit.click();
  await page.getByLabel("Username", { exact: true }).fill("bad username");
  await page.getByRole("button", { name: "Apply profile changes", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveText("Usernames must contain 3 to 30 characters.");
  await page.keyboard.press("Escape");
  await expect(page.locator("main")).toContainText("@jessica_lee");
  await page.getByRole("link", { name: "Edit preferences", exact: true }).click();
  await expect(page).toHaveURL(/\/onboarding$/);
});

for (const width of [1280, 390]) {
  test(`username warnings preserve the profile layout at ${width}px`, async ({ page, context }) => {
    await page.setViewportSize({ width, height: 900 });
    await setupScheduling(page, context);
    await page.goto("/profile");
    await page.getByRole("button", { name: "Edit profile", exact: true }).click();
    await page.evaluate(() => document.fonts.ready);
    const card = page.locator(".profile-settings-content");
    const preferences = page.getByRole("heading", { name: "Preferences", exact: true });
    const height = (await card.boundingBox())!.height;
    const top = await preferences.evaluate(element => element.getBoundingClientRect().top + window.scrollY);
    const username = page.getByLabel("Username", { exact: true });
    for (const value of ["ab", "a".repeat(31), "bad username", "name!"]) {
      await username.fill(value);
      await page.getByRole("button", { name: "Apply profile changes", exact: true }).click();
      await expect(page.getByRole("alert")).toHaveText("Usernames must contain 3 to 30 characters.");
      await expect(username).toHaveAttribute("aria-invalid", "true");
      await expect(username).toHaveCSS("background-color", "rgb(255, 241, 243)");
      await expect(username).toBeFocused();
      expect(Math.abs((await card.boundingBox())!.height - height)).toBeLessThan(1);
      expect(Math.abs(await preferences.evaluate(element => element.getBoundingClientRect().top + window.scrollY) - top)).toBeLessThan(1);
      await username.click();
      await expect(username).toHaveAttribute("aria-invalid", "false");
      await expect(username).toHaveCSS("background-color", "rgb(255, 255, 255)");
      await expect(page.getByRole("alert")).toBeEmpty();
    }
  });
}

test("security shortcut opens a placeholder and profile details persist after reload", async ({ page, context }) => {
  await setupScheduling(page, context);
  await page.goto("/profile");
  await page.getByRole("button", { name: "Edit profile", exact: true }).click();
  await page.getByLabel("First name", { exact: true }).fill("Jessica");
  await page.getByRole("button", { name: "Apply profile changes", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Jessica", exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Jessica", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Account security", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Account security", exact: true })).toBeVisible();
  await expect(page.locator("main")).toContainText("Email and password settings are coming soon.");
});

test.describe("mobile profile", () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test("overview and edit fields fit a small screen", async ({ page, context }) => {
    await setupScheduling(page, context);
    await page.goto("/profile");
    await expect(page.getByRole("heading", { name: "Your Profile", exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: test.info().outputPath("profile-mobile.png") });
    const preferences = page.getByRole("heading", { name: "Preferences", exact: true });
    const preferencesTop = await preferences.evaluate(element => element.getBoundingClientRect().top + window.scrollY);
    const cardHeight = (await page.locator(".profile-settings-content").boundingBox())!.height;
    await page.getByRole("button", { name: "Edit profile", exact: true }).click();
    await page.getByLabel("First name", { exact: true }).fill("A very long first name");
    await page.getByLabel("Last name", { exact: true }).fill("A very long last name");
    expect(Math.abs(await preferences.evaluate(element => element.getBoundingClientRect().top + window.scrollY) - preferencesTop)).toBeLessThan(1);
    expect(Math.abs((await page.locator(".profile-settings-content").boundingBox())!.height - cardHeight)).toBeLessThan(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: test.info().outputPath("profile-edit-mobile.png") });
  });
});

test("duplicate usernames and failed saves retain the draft and allow retry", async ({ page, context }) => {
  const state = await setupScheduling(page, context);
  state.profiles.set("another-account", { first_name: "Other", last_name: null, username: "taken", updated_at: null });
  await page.goto("/profile");
  await page.getByRole("button", { name: "Edit profile", exact: true }).click();
  await page.getByLabel("First name", { exact: true }).fill("Jessica");
  const username = page.getByLabel("Username", { exact: true });
  await username.fill("taken");
  const apply = page.getByRole("button", { name: "Apply profile changes", exact: true });
  const height = (await page.locator(".profile-settings-content").boundingBox())!.height;
  await apply.click();
  await expect(page.getByText("This username is already taken.", { exact: true })).toBeVisible();
  await expect(username).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByLabel("First name", { exact: true })).toHaveValue("Jessica");
  await username.click();
  await expect(username).toHaveAttribute("aria-invalid", "false");
  await username.fill("available");
  state.failProfileWrite = true;
  await apply.click();
  await expect(page.getByText("Unable to save profile. Please retry.", { exact: true })).toBeVisible();
  await expect(username).toHaveValue("available");
  expect(Math.abs((await page.locator(".profile-settings-content").boundingBox())!.height - height)).toBeLessThan(1);
  state.failProfileWrite = false;
  await apply.click();
  await expect(page.getByRole("heading", { name: "Jessica", exact: true })).toBeVisible();
  await page.reload();
  await expect(page.locator("main")).toContainText("@available");
});

test("profile loading can be retried and account details stay separate", async ({ page, context }) => {
  const state = await setupScheduling(page, context);
  state.failProfileRead = true;
  await page.goto("/profile");
  await expect(page.getByText("Unable to load profile. Please retry.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Edit profile", exact: true })).toHaveCount(0);
  state.failProfileRead = false;
  await page.getByRole("button", { name: "Retry profile", exact: true }).click();
  await page.getByRole("button", { name: "Edit profile", exact: true }).click();
  await page.getByLabel("First name", { exact: true }).fill("Account A");
  await page.getByRole("button", { name: "Apply profile changes", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Account A", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Log out", exact: true }).click();
  await page.getByRole("link", { name: "Log in", exact: true }).click();
  await page.getByRole("textbox", { name: "Email address", exact: true }).fill("b@example.com");
  await page.getByLabel("Password", { exact: true }).fill("test-password");
  await page.getByRole("button", { name: /log in/i }).click();
  await expect(page.getByRole("heading", { name: "Your Profile", exact: true })).toBeVisible();
  await expect(page.locator("main")).not.toContainText("Account A");
  await page.getByRole("button", { name: "Edit profile", exact: true }).click();
  await page.getByLabel("First name", { exact: true }).fill("Account B");
  await page.getByRole("button", { name: "Apply profile changes", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Account B", exact: true })).toBeVisible();
  expect([...state.profiles.values()].map(profile => profile.first_name).sort((a, b) => (a ?? "").localeCompare(b ?? ""))).toEqual(["Account A", "Account B"]);
});

test("pending profile saves keep the editor open and prevent additional edits", async ({ page, context }) => {
  await setupScheduling(page, context);
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  let writes = 0;
  await page.route("**/test-api/users/me/profile", async route => {
    if (route.request().method() === "PUT") {
      writes += 1;
      await gate;
    }
    await route.fallback();
  });
  await page.goto("/profile");
  await page.getByRole("button", { name: "Edit profile", exact: true }).click();
  await page.getByLabel("First name", { exact: true }).fill("Jessica");
  const apply = page.getByRole("button", { name: "Apply profile changes", exact: true });
  const height = (await page.locator(".profile-settings-content").boundingBox())!.height;
  await apply.click();
  await expect(page.getByRole("status")).toHaveText("Saving…");
  await expect(apply).toBeDisabled();
  await expect(page.getByLabel("First name", { exact: true })).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(apply).toBeVisible();
  expect(Math.abs((await page.locator(".profile-settings-content").boundingBox())!.height - height)).toBeLessThan(1);
  release();
  await expect(page.getByRole("heading", { name: "Jessica", exact: true })).toBeVisible();
  expect(writes).toBe(1);
});
