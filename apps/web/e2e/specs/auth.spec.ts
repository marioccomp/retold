import { expect, test } from "@playwright/test";
import {
  cleanupE2ERun,
  createE2ERunId,
  createE2EUser,
  createPasswordResetToken,
  getE2EUserState,
} from "../helpers/db";
import {
  loginThroughUi,
  logoutThroughUi,
  preparePage,
  waitForAuthSessionCookie,
} from "../helpers/ui";

const runsToCleanup = new Set<string>();

test.beforeEach(async ({ page }) => {
  await preparePage(page);
});

test.afterEach(async () => {
  for (const runId of runsToCleanup) {
    await cleanupE2ERun(runId);
  }
  runsToCleanup.clear();
});

test.describe("auth flows", () => {
  test("registers a new account, auto-signs in, and allows onboarding skip", async ({
    page,
  }) => {
    const runId = createE2ERunId("register");
    runsToCleanup.add(runId);
    const email = `integration+${runId}-register@example.com`;
    const username = `e2e_${runId.replace(/[^a-z0-9]/gi, "").slice(-8)}`.toLowerCase();
    const password = `Secret123!${runId.slice(-4)}`;

    await page.goto("/register");
    await page.getByTestId("register-name-input").fill("E2E Register User");
    await page.getByTestId("register-username-input").fill(username);
    await page.getByTestId("register-email-input").fill(email);
    await page.getByTestId("register-password-input").fill(password);
    await page.getByTestId("register-confirm-password-input").fill(password);

    await expect(page.getByTestId("register-submit-button")).toBeEnabled();
    await page.getByTestId("register-submit-button").click();

    await expect(page).toHaveURL(/\/onboarding$/);
    await expect(page.getByTestId("onboarding-skip-button")).toBeVisible();

    await page.getByTestId("onboarding-skip-button").click();

    await expect(page).toHaveURL("http://localhost:3000/");
    await expect(page.getByTestId("header-user-menu-trigger")).toBeVisible();
  });

  test("shows an error when credentials are invalid", async ({ page }) => {
    const runId = createE2ERunId("invalid-login");
    runsToCleanup.add(runId);
    const { user } = await createE2EUser({
      runId,
      label: "owner",
    });

    await loginThroughUi(page, user.email, "WrongPassword123!");

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByText("Incorrect email/username or password")).toBeVisible();
  });

  test("logs in and logs out with an existing account", async ({ page }) => {
    const runId = createE2ERunId("login-logout");
    runsToCleanup.add(runId);
    const { user, password } = await createE2EUser({
      runId,
      label: "owner",
    });

    await loginThroughUi(page, user.email, password);

    await expect(page).toHaveURL("http://localhost:3000/");
    await expect(page.getByTestId("header-user-menu-trigger")).toBeVisible();

    await logoutThroughUi(page);

    await expect(page).toHaveURL("http://localhost:3000/");
    await expect(page.getByTestId("header-login-button")).toBeVisible();
  });

  test("redirects unauthenticated visitors away from choose-username", async ({ page }) => {
    await page.goto("/choose-username");

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByTestId("login-form")).toBeVisible();
  });

  test("lets a signed-in user complete the onboarding flow", async ({
    page,
  }) => {
    const runId = createE2ERunId("onboarding");
    runsToCleanup.add(runId);
    const { user, password } = await createE2EUser({
      runId,
      label: "owner",
      username: `flow_${runId.slice(-6)}`.toLowerCase(),
      hasCompletedOnboarding: false,
    });

    await loginThroughUi(page, user.email, password);
    await waitForAuthSessionCookie(page);
    await page.goto("/onboarding");

    await expect(page).toHaveURL(/\/onboarding$/);
    await expect(page.getByTestId("onboarding-next-button")).toBeVisible();

    await page.getByTestId("onboarding-skip-button").click();

    await expect
      .poll(async () => (await getE2EUserState(user.id))?.hasCompletedOnboarding)
      .toBe(true);

    await page.goto("/");
    await expect(page).toHaveURL("http://localhost:3000/");
  });

  test("resets a password with a valid recovery token and signs in with the new password", async ({
    page,
  }) => {
    const runId = createE2ERunId("reset-password");
    runsToCleanup.add(runId);
    const { user } = await createE2EUser({
      runId,
      label: "owner",
    });
    const rawToken = await createPasswordResetToken(user.id);
    const newPassword = `Updated123!${runId.slice(-4)}`;

    await page.goto(`/reset-password?token=${rawToken}`);
    await page.getByTestId("reset-password-input").fill(newPassword);
    await page.getByTestId("reset-password-submit-button").click();

    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByTestId("login-form")).toBeVisible();

    await page.getByTestId("login-identifier-input").fill(user.email);
    await page.getByTestId("login-password-input").fill(newPassword);
    await page.getByTestId("login-submit-button").click();

    await expect(page.getByTestId("header-user-menu-trigger")).toBeVisible();
    await expect(page.getByTestId("login-form")).not.toBeVisible();
  });
});
