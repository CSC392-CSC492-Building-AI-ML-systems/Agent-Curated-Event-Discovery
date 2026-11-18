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
  await expect(navigation.getByRole("link")).toHaveCount(7);
  const friends = navigation.getByRole("link", { name: "Friends", exact: true });
  await expect(friends).toHaveAttribute("href", "/profile/friends");
  await friends.click();
  await expect(page.getByRole("heading", { name: "Friends", exact: true })).toBeVisible();
  await expect(friends).toHaveAttribute("aria-current", "page");
  await expect(page.locator("main")).toContainText("Your friends and friend requests will appear here.");
  await navigation.getByRole("link", { name: "Profile settings", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your Profile", exact: true })).toBeVisible();
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

test("security shortcut opens the forms and profile details persist after reload", async ({ page, context }) => {
  await setupScheduling(page, context);
  await page.goto("/profile");
  await page.getByRole("button", { name: "Edit profile", exact: true }).click();
  await page.getByLabel("First name", { exact: true }).fill("Jessica");
  await page.getByRole("button", { name: "Apply profile changes", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Jessica", exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Jessica", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Security", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Security", exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Change Email", exact: true })).toBeVisible();
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

for (const width of [1280, 390]) {
  test(`security forms validate and update mocked credentials at ${width}px`, async ({ page, context }) => {
    await page.setViewportSize({ width, height: 900 });
    await setupScheduling(page, context);
    const credentialWrites: string[] = [];
    page.on("request", request => {
      if (request.method() === "PUT" && request.url().includes("/auth/v1/user")) credentialWrites.push(request.url());
    });
    await page.goto("/profile/security");
    const email = page.getByRole("region", { name: "Change Email", exact: true });
    const password = page.getByRole("region", { name: "Change Password", exact: true });
    const requirements = password.getByText("Use at least 8 characters, including an uppercase letter, a number, and a special character.", { exact: true });
    await expect(requirements).toHaveCount(0);
    await expect(email.getByLabel("New email address", { exact: true })).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const card = page.locator(".security-content");
    const height = (await card.boundingBox())!.height;
    await email.getByRole("button", { name: "Update email", exact: true }).click();
    await expect(email.getByRole("alert")).toHaveText("Enter a valid email address.");
    await email.getByLabel("New email address", { exact: true }).fill("test@example.com");
    await email.getByRole("button", { name: "Update email", exact: true }).click();
    await expect(email.getByRole("alert")).toHaveText("Enter a different email address.");
    await email.getByLabel("New email address", { exact: true }).fill("new@example.com");
    await email.getByRole("button", { name: "Update email", exact: true }).click();
    await expect(email.getByRole("status")).toHaveText("Confirmation emails have been sent to your current and new email addresses.");
    await expect(email.getByLabel("New email address", { exact: true })).toHaveValue("");
    await password.getByLabel("New password", { exact: true }).fill("short");
    await password.getByRole("button", { name: "Update password", exact: true }).click();
    await expect(password.getByRole("alert")).toContainText("at least 8 characters");
    await expect(requirements).toHaveCount(1);
    await password.getByLabel("New password", { exact: true }).fill("Password123!");
    await expect(requirements).toHaveCount(0);
    await password.getByLabel("Confirm new password", { exact: true }).fill("Different123!");
    await password.getByRole("button", { name: "Update password", exact: true }).click();
    await expect(password.getByRole("alert")).toHaveText("Your passwords don’t match.");
    await password.getByRole("button", { name: "Show new password", exact: true }).click();
    await expect(password.getByLabel("New password", { exact: true })).toHaveAttribute("type", "text");
    await password.getByRole("button", { name: "Hide new password", exact: true }).click();
    await expect(password.getByLabel("New password", { exact: true })).toHaveAttribute("type", "password");
    await password.getByLabel("Confirm new password", { exact: true }).fill("Password123!");
    await password.getByRole("button", { name: "Update password", exact: true }).click();
    await expect(password.getByRole("status")).toHaveText("Your password has been changed.");
    await expect(password.getByLabel("New password", { exact: true })).toHaveValue("");
    expect(Math.abs((await card.boundingBox())!.height - height)).toBeLessThan(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect(credentialWrites).toHaveLength(2);
    const cardBounds = (await card.boundingBox())!;
    const formBounds = (await password.boundingBox())!;
    expect(formBounds.y + formBounds.height).toBeLessThan(cardBounds.y + cardBounds.height);
    const deletion = page.getByRole("button", { name: "Delete my account", exact: true });
    await expect(deletion).toBeVisible();
    await expect(deletion).toHaveCSS("color", "rgb(255, 255, 255)");
    await deletion.click();
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    expect(Math.abs((await card.boundingBox())!.height - height)).toBeLessThan(1);
    const deletionBounds = (await deletion.boundingBox())!;
    // Clicking the footer can scroll the page; compare all viewport positions
    // after that click rather than mixing pre-scroll and post-scroll bounds.
    const finalFormBounds = (await password.boundingBox())!;
    const finalCardBounds = (await card.boundingBox())!;
    expect(deletionBounds.y).toBeGreaterThan(finalFormBounds.y + finalFormBounds.height);
    expect(deletionBounds.y + deletionBounds.height).toBeLessThan(finalCardBounds.y + finalCardBounds.height);
    await page.screenshot({ path: test.info().outputPath(`security-${width}.png`), fullPage: true });
  });
}

for (const providers of [["email"], ["google"], ["email", "google"]]) {
  test(`security options reflect linked providers: ${providers.join(" and ")}`, async ({ page, context }) => {
    await setupScheduling(page, context, { providers });
    const changes: string[] = [];
    page.on("request", request => {
      if (["POST", "PUT", "DELETE"].includes(request.method()) && request.url().includes("/auth/v1/")) changes.push(request.url());
    });
    await page.goto("/profile/security");
    const googleLinked = providers.includes("google");
    const action = googleLinked && !providers.includes("email") ? "Set password" : "Update password";
    await expect(page.getByRole("region", { name: "Change Email", exact: true })).toBeVisible();
    const password = page.getByRole("region", { name: "Change Password", exact: true });
    await expect(password).toBeVisible();
    const googleSection = page.getByRole("region", { name: "Google account", exact: true });
    await expect(googleSection).toHaveCount(googleLinked ? 1 : 0);
    if (googleLinked) await expect(googleSection).toHaveText("Your account is linked with Google.");
    await password.getByLabel("New password", { exact: true }).fill("Password123!");
    await password.getByLabel("Confirm new password", { exact: true }).fill("Password123!");
    await password.getByRole("button", { name: action, exact: true }).click();
    await expect(password.getByRole("status")).toHaveText("Your password has been changed.");
    await expect(password.getByLabel("New password", { exact: true })).toHaveValue("");
    await page.getByRole("button", { name: "Delete my account", exact: true }).click();
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    expect(changes).toHaveLength(1);
  });
}

test("account deletion dialog has a heading and safely restores keyboard focus", async ({ page, context }) => {
  const state = await setupScheduling(page, context);
  state.failAccountDelete = true;
  await page.goto("/profile/security");
  const trigger = page.getByRole("button", { name: "Delete my account", exact: true });
  const dialog = page.getByRole("dialog", { name: "Delete account", exact: true });
  await trigger.click();
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("heading", { name: "Delete account", exact: true })).toBeVisible();
  await expect(dialog.getByRole("button")).toHaveText(["Delete account", "Cancel"]);
  await expect(dialog).toContainText("This cannot be undone.");
  await expect(dialog.getByRole("button", { name: "Cancel", exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await trigger.click();
  await dialog.getByRole("button", { name: "Delete account", exact: true }).click();
  await expect(dialog.getByRole("alert")).toHaveText("Unable to delete your account; please retry");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(trigger).toBeFocused();
});

test("deletion waits for confirmation, disables duplicate submits, signs out and redirects to Discover", async ({ page, context }) => {
  const state = await setupScheduling(page, context);
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  let calls = 0;
  await page.route("**/test-api/users/me/account", async route => {
    calls += 1;
    expect(route.request().postData()).toBe(null);
    expect(route.request().headers().authorization).toContain("Bearer ");
    await gate;
    await route.fallback();
  });
  await page.goto("/profile/security");
  await page.getByRole("button", { name: "Delete my account", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Delete account", exact: true });
  expect(calls).toBe(0);
  await dialog.getByRole("button", { name: "Delete account", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "Delete account", exact: true })).toBeDisabled();
  await expect(dialog.getByRole("button", { name: "Cancel", exact: true })).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();
  await expect(page).toHaveURL(/\/profile\/security$/);
  release();
  await expect(page).toHaveURL("http://127.0.0.1:5178/");
  await expect(page.getByRole("link", { name: "Sign Up / Log In", exact: true })).toBeVisible();
  await expect(page.getByText("Your account has been deleted.", { exact: true })).toHaveCount(0);
  expect(calls).toBe(1);
  expect(state.accountDeletions).toEqual(["00000000-0000-4000-8000-000000000001"]);
  const cookies = await context.cookies();
  expect(cookies.some(cookie => cookie.name.startsWith("sb-onboarding-test-auth-token") && cookie.value)).toBe(false);
  await page.reload();
  await expect(page.getByRole("link", { name: "Sign Up / Log In", exact: true })).toBeVisible();
});

test("deletion failures can be retried and expired reauthentication links back to login", async ({ page, context }) => {
  const state = await setupScheduling(page, context);
  state.requireAccountReauthentication = true;
  await page.goto("/profile/security");
  await page.getByRole("button", { name: "Delete my account", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Delete account", exact: true });
  await dialog.getByRole("button", { name: "Delete account", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("Please log in again");
  await expect(dialog.getByRole("link", { name: "Log in again", exact: true })).toHaveAttribute("href", "/login");
  await expect(page).toHaveURL(/\/profile\/security$/);
  state.requireAccountReauthentication = false;
  state.failAccountDelete = true;
  await dialog.getByRole("button", { name: "Delete account", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("Unable to delete your account");
  expect(state.accountDeletions).toEqual([]);
  state.failAccountDelete = false;
  await dialog.getByRole("button", { name: "Delete account", exact: true }).click();
  await expect(page).toHaveURL("http://127.0.0.1:5178/");
  await expect(page.getByText("Your account has been deleted.", { exact: true })).toHaveCount(0);
});

test("logout HTTP errors still redirect when the SDK has cleared the local session", async ({ page, context }) => {
  const state = await setupScheduling(page, context);
  await page.route("https://onboarding-test.supabase.co/auth/v1/logout**", async route => {
    return route.fulfill({ status: 400, json: { code: "unexpected_failure", msg: "Sign out failed" } });
  });
  await page.goto("/profile/security");
  await page.getByRole("button", { name: "Delete my account", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Delete account", exact: true });
  await dialog.getByRole("button", { name: "Delete account", exact: true }).click();
  await expect(page).toHaveURL("http://127.0.0.1:5178/");
  await expect(page.getByRole("link", { name: "Sign Up / Log In", exact: true })).toBeVisible();
  await expect(page.getByText("Your account has been deleted.", { exact: true })).toHaveCount(0);
  expect(state.accountDeletions).toHaveLength(1);
});

test("credential failures keep drafts and show success only after retry succeeds", async ({ page, context }) => {
  const state = await setupScheduling(page, context);
  state.failCredentialUpdate = true;
  await page.goto("/profile/security");
  const email = page.getByRole("region", { name: "Change Email", exact: true });
  const password = page.getByRole("region", { name: "Change Password", exact: true });
  await email.getByLabel("New email address", { exact: true }).fill("new@example.com");
  await email.getByRole("button", { name: "Update email", exact: true }).click();
  await expect(email.getByRole("alert")).toContainText("Unable to update credentials");
  await expect(email.getByRole("status")).toBeEmpty();
  await expect(email.getByLabel("New email address", { exact: true })).toHaveValue("new@example.com");
  await password.getByLabel("New password", { exact: true }).fill("Password123!");
  await password.getByLabel("Confirm new password", { exact: true }).fill("Password123!");
  await password.getByRole("button", { name: "Update password", exact: true }).click();
  await expect(password.getByRole("alert")).toContainText("Unable to update credentials");
  await expect(password.getByRole("status")).toBeEmpty();
  await expect(password.getByLabel("New password", { exact: true })).toHaveValue("Password123!");
  state.failCredentialUpdate = false;
  await password.getByRole("button", { name: "Update password", exact: true }).click();
  await expect(password.getByRole("status")).toHaveText("Your password has been changed.");
  await expect(password.getByLabel("Confirm new password", { exact: true })).toHaveValue("");
});

test("password updates obtain and validate a reauthentication code", async ({ page, context }) => {
  const state = await setupScheduling(page, context);
  state.requirePasswordReauthentication = true;
  await page.goto("/profile/security");
  const form = page.getByRole("region", { name: "Change Password", exact: true });
  await form.getByLabel("New password", { exact: true }).fill("Password123!");
  await form.getByLabel("Confirm new password", { exact: true }).fill("Password123!");
  await form.getByRole("button", { name: "Update password", exact: true }).click();
  await expect(form.getByLabel("Confirmation code")).toBeVisible();
  await expect(form.getByRole("status")).toContainText("confirmation code sent");
  await form.getByLabel("Confirmation code").fill("000000");
  await form.getByRole("button", { name: "Update password", exact: true }).click();
  await expect(form.getByRole("alert")).toHaveText("Invalid confirmation code.");
  await expect(form.getByRole("status")).toBeEmpty();
  await form.getByLabel("Confirmation code").fill("123456");
  await form.getByRole("button", { name: "Update password", exact: true }).click();
  await expect(form.getByRole("status")).toHaveText("Your password has been changed.");
  expect(state.credentialWrites.at(-1)).toMatchObject({ nonce: "123456", password: "Password123!" });
});

test("Google identities with a password use Update password even without email provider metadata", async ({ page, context }) => {
  await setupScheduling(page, context, { providers: ["google"], hasPassword: true });
  await page.goto("/profile/security");
  await expect(page.getByRole("button", { name: "Update password", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Set password", exact: true })).toHaveCount(0);
});

test("setting a Google account password persists the password mode after reload", async ({ page, context }) => {
  await setupScheduling(page, context, { providers: ["google"], hasPassword: false });
  await page.goto("/profile/security");
  const form = page.getByRole("region", { name: "Change Password", exact: true });
  await form.getByLabel("New password", { exact: true }).fill("Password123!");
  await form.getByLabel("Confirm new password", { exact: true }).fill("Password123!");
  await form.getByRole("button", { name: "Set password", exact: true }).click();
  await expect(form.getByRole("status")).toHaveText("Your password has been changed.");
  await page.reload();
  await expect(form.getByRole("button", { name: "Update password", exact: true })).toBeVisible();
});

test("a rejected email confirmation does not display a success message", async ({ page, context }) => {
  await setupScheduling(page, context);
  await page.goto("/profile/security#error=access_denied&error_code=otp_expired&error_description=Link+expired");
  await expect(page.getByRole("alert").filter({ hasText: "Unable to confirm your email" })).toBeVisible();
});

test("password updates can supply the current password when required by Auth", async ({ page, context }) => {
  const state = await setupScheduling(page, context);
  state.requireCurrentPassword = true;
  await page.goto("/profile/security");
  const form = page.getByRole("region", { name: "Change Password", exact: true });
  await form.getByLabel("New password", { exact: true }).fill("Password123!");
  await form.getByLabel("Confirm new password", { exact: true }).fill("Password123!");
  await form.getByRole("button", { name: "Update password", exact: true }).click();
  await expect(form.getByLabel("Current password", { exact: true })).toBeVisible();
  await form.getByLabel("Current password", { exact: true }).fill("OldPassword123!");
  await form.getByRole("button", { name: "Update password", exact: true }).click();
  await expect(form.getByRole("status")).toHaveText("Your password has been changed.");
  expect(state.credentialWrites.at(-1)).toMatchObject({ current_password: "OldPassword123!" });
});

test("email confirmations exchange the PKCE code once and refresh the displayed email", async ({ page, context }) => {
  await setupScheduling(page, context);
  let redirect = "";
  let exchanges = 0;
  page.on("request", request => {
    const url = new URL(request.url());
    if (url.pathname === "/auth/v1/user" && request.method() === "PUT") {
      redirect = url.searchParams.get("redirect_to") ?? "";
    }
    if (url.searchParams.get("grant_type") === "pkce") exchanges += 1;
  });
  await page.goto("/profile/security");
  const form = page.getByRole("region", { name: "Change Email", exact: true });
  await form.getByLabel("New email address", { exact: true }).fill("new@example.com");
  await form.getByRole("button", { name: "Update email", exact: true }).click();
  await expect(form.getByRole("status")).toHaveText("Confirmation emails have been sent to your current and new email addresses.");
  expect(redirect).toContain("http://127.0.0.1:5178/profile/security");
  const callback = new URL(redirect);
  callback.searchParams.set("code", "test-confirmation-code");
  await page.goto(callback.toString());
  await expect(page.getByRole("button", { name: "Update password", exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/profile\/security$/);
  expect(exchanges).toBe(1);
  await page.getByRole("link", { name: "Profile settings", exact: true }).click();
  await expect(page.getByText("new@example.com", { exact: true })).toBeVisible();
});

test("pending credential updates disable duplicate submissions", async ({ page, context }) => {
  const state = await setupScheduling(page, context);
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route("https://onboarding-test.supabase.co/auth/v1/user**", async route => {
    if (route.request().method() === "PUT") await gate;
    await route.fallback();
  });
  await page.goto("/profile/security");
  const form = page.getByRole("region", { name: "Change Email", exact: true });
  await form.getByLabel("New email address", { exact: true }).fill("new@example.com");
  const submit = form.getByRole("button", { name: "Update email", exact: true });
  await submit.click();
  await expect(submit).toBeDisabled();
  await expect(form.getByLabel("New email address", { exact: true })).toBeDisabled();
  await expect(form.getByRole("status")).toHaveText("Updating email…");
  release();
  await expect(form.getByRole("status")).toHaveText("Confirmation emails have been sent to your current and new email addresses.");
  expect(state.credentialWrites).toHaveLength(1);
});

test("an email confirmation opened without its browser verifier shows a useful error", async ({ page, context }) => {
  await setupScheduling(page, context);
  // Another browser can have a valid login but lack this email change's PKCE verifier.
  await page.goto("/profile/security?code=confirmation-from-another-browser");
  await expect(page.getByRole("alert").filter({ hasText: "Unable to confirm your email" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Update password", exact: true })).toBeVisible();
});
