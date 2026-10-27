import { defineConfig } from "@playwright/test";

// Uses fake Supabase credentials and intercepted API responses; no live accounts.
export default defineConfig({
  testDir: "./tests",
  testMatch: "onboarding.spec.ts",
  fullyParallel: true,
  workers: 2,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: "list",
  use: { baseURL: "http://127.0.0.1:5178", browserName: "chromium", trace: "retain-on-failure" },
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 5178 --strictPort",
    url: "http://127.0.0.1:5178",
    reuseExistingServer: false,
    env: {
      VITE_SUPABASE_URL: "https://onboarding-test.supabase.co",
      VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
      VITE_API_BASE_URL: "http://127.0.0.1:5178/test-api",
    },
  },
});
