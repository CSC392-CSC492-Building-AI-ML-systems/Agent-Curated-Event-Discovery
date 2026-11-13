import { defineConfig } from "@playwright/test";
import onboarding from "./playwright.onboarding.config";

// Share the isolated server settings without depending on live accounts or data.
export default defineConfig({
  ...onboarding,
  testMatch: ["scheduling.spec.ts", "calendarExport.spec.ts", "eventConflicts.spec.ts", "calendarSubscription.spec.ts"],
});
