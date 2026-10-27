import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    // Optional: point at a pre-installed Chromium when the bundled browser version differs.
    launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {},
  },
  webServer: process.env.E2E_BASE_URL ? undefined : { command: "npm run start", url: "http://localhost:3000/login", reuseExistingServer: true, timeout: 120_000 },
});
