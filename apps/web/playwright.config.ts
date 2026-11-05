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
  // GitHub Actions' standard runners are noticeably slower than a dev
  // laptop for this kind of CPU-bound work (bcrypt hashing on every
  // login/register, Postgres round-trips, SSR) — the local-tuned 10s
  // action/expect timeouts were being legitimately exceeded there
  // (consistently, on both the initial attempt and the retry, not
  // flakily), not masking an actual behavioral bug.
  timeout: isCI ? 90_000 : 60_000,
  expect: {
    timeout: isCI ? 20_000 : 10_000,
  },
  // In CI the "github" reporter turns each failure into a PR annotation,
  // readable without downloading the job log.
  reporter: isCI ? [["github"], ["list"]] : "list",
  outputDir: "./test-results/e2e",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
    actionTimeout: isCI ? 20_000 : 10_000,
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
