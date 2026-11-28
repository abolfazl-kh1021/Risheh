import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  retries: 0,
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:3100",
    locale: "fa-IR",
    viewport: { width: 1280, height: 800 },
    trace: "retain-on-failure",
  },
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: "bun next dev -p 3100",
        url: "http://localhost:3100/api/health",
        reuseExistingServer: true,
        timeout: 90_000,
      },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
});
