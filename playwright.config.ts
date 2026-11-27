import { loadEnvConfig } from "@next/env";
import { defineConfig, devices } from "@playwright/test";

// next build inlines COMMIT_SHA from .env files, so the tests must read the same value.
loadEnvConfig(process.cwd());

const deployedUrl = process.env.PLAYWRIGHT_BASE_URL;
const localUrl = "http://localhost:3000";
// unreachable-database.spec.ts uses this server, whose database host does not resolve.
const unreachableDatabaseUrl = "http://localhost:3001";

export default defineConfig({
  testDir: "./e2e",
  // The other specs need the prices CI loads from e2e/fixture-prices.sql and the local servers.
  testMatch: deployedUrl ? "smoke.spec.ts" : undefined,
  forbidOnly: Boolean(process.env.CI),
  use: {
    baseURL: deployedUrl ?? localUrl,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: deployedUrl
    ? undefined
    : [
        {
          command: "pnpm start",
          url: localUrl,
          reuseExistingServer: !process.env.CI,
        },
        {
          command: "pnpm start --port 3001",
          url: unreachableDatabaseUrl,
          reuseExistingServer: !process.env.CI,
          env: { DATABASE_URL: "postgresql://user:password@db.invalid/neondb" },
        },
      ],
});
