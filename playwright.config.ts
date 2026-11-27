import { loadEnvConfig } from "@next/env";
import { defineConfig, devices } from "@playwright/test";

// next build inlines COMMIT_SHA from .env files, so the tests must read the same value.
loadEnvConfig(process.cwd());

const deployedUrl = process.env.PLAYWRIGHT_BASE_URL;
const localUrl = "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  forbidOnly: Boolean(process.env.CI),
  use: {
    baseURL: deployedUrl ?? localUrl,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: deployedUrl
    ? undefined
    : {
        command: "pnpm start",
        url: localUrl,
        reuseExistingServer: !process.env.CI,
      },
});
