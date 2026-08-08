import path from "path";
import { existsSync } from "fs";
import dotenv from "dotenv";
import { defineConfig, devices } from "@playwright/test";

dotenv.config({
  path: path.resolve(__dirname, "../../.env"),
  override: true,
});

const chromeExecutable =
  process.env.PLAYWRIGHT_CHROME_PATH ||
  (process.platform === "win32"
    ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
    : undefined);

const launchOptions =
  chromeExecutable && existsSync(chromeExecutable)
    ? {
        executablePath: chromeExecutable,
      }
    : undefined;

const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: "./e2e/specs",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  reporter: "list",
  outputDir: "./test-results/e2e",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
    actionTimeout: 10_000,
    testIdAttribute: "data-testid",
    launchOptions,
  },
  webServer: {
    // Turbopack's dev server recompiles routes incrementally as tests navigate
    // around, and its incremental module graph has known internal stability
    // bugs (e.g. "inner_of_uppers_lost_follower" panics) that surface as
    // random ERR_ABORTED navigations after enough route compilations pile up
    // in one long-lived `next dev` process. A production build has no
    // incremental compilation, so it doesn't hit that class of bug — use it
    // in CI where determinism matters more than a ~30-60s longer startup.
    command: isCI ? "pnpm build && pnpm start" : "pnpm dev --port 3000",
    cwd: __dirname,
    url: "http://localhost:3000",
    timeout: isCI ? 300_000 : 180_000,
    reuseExistingServer: !isCI,
    env: {
      ...process.env,
      NODE_ENV: isCI ? "production" : "development",
      PORT: "3000",
      NEXTAUTH_URL: "http://localhost:3000",
      APP_URL: "http://localhost:3000",
      E2E_BYPASS_RATE_LIMITS: "true",
    },
  },
});
