import { defineConfig } from "@playwright/test";
import onboarding from "./playwright.onboarding.config";

export default defineConfig({ ...onboarding, testMatch: ["availability.spec.ts", "availabilityContract.spec.ts"] });
