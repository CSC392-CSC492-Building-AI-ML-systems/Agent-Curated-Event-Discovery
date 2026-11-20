import { defineConfig } from "@playwright/test";
import onboarding from "./playwright.onboarding.config";

export default defineConfig({ ...onboarding, testMatch: "profile.spec.ts" });
