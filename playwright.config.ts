import { defineConfig, devices } from "@playwright/test";

/**
 * Walking-skeleton e2e config. Boots the app with `npm run dev` and runs the
 * smoke suite in tests/e2e against it. The smoke tests are read-only — they
 * perform no sign-in and write no data.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  fullyParallel: true,
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000/login",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
