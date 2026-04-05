import { expect, test } from "@playwright/test";
import {
  cleanupE2ERun,
  createE2ERunId,
  createE2EUser,
  getE2EUserState,
} from "../helpers/db";
import { loginThroughUi, preparePage } from "../helpers/ui";

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

test.describe("settings flows", () => {
  test("updates a password and requires the user to sign in again", async ({ page }) => {
    const runId = createE2ERunId("settings-password");
    runsToCleanup.add(runId);
    const { user, password } = await createE2EUser({
      runId,
      label: "owner",
    });
    const updatedPassword = `NewSecret123!${runId.slice(-3)}`;

    await loginThroughUi(page, user.email, password);
    await expect(page.getByTestId("header-user-menu-trigger")).toBeVisible();
    await page.goto("/settings");

    await page.getByTestId("settings-tab-security").click();
    await page.getByTestId("settings-current-password-input").fill(password);
    await page.getByTestId("settings-new-password-input").fill(updatedPassword);
    await page.getByTestId("settings-confirm-password-input").fill(updatedPassword);
    await page.getByTestId("settings-password-submit-button").click();

    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByTestId("login-form")).toBeVisible();

    await loginThroughUi(page, user.email, updatedPassword);

    await expect(page).toHaveURL("http://localhost:3000/");
    await expect(page.getByTestId("header-user-menu-trigger")).toBeVisible();
  });

  test("deletes an account and prevents a future sign-in", async ({ page }) => {
    const runId = createE2ERunId("delete-account");
    runsToCleanup.add(runId);
    const { user, password } = await createE2EUser({
      runId,
      label: "owner",
    });

    await loginThroughUi(page, user.email, password);
    await expect(page.getByTestId("header-user-menu-trigger")).toBeVisible();
    await page.goto("/settings");

    await page.getByTestId("settings-tab-danger").click();
    await page.getByTestId("settings-open-delete-modal-button").click();

    await expect(page.getByTestId("settings-delete-modal")).toBeVisible();
    await page.getByTestId("settings-delete-password-input").fill(password);
    await page.getByTestId("settings-confirm-delete-button").click();

    await expect.poll(async () => getE2EUserState(user.id)).toBeNull();

    const loginPage = await page.context().newPage();
    await preparePage(loginPage);
    await loginPage.goto("/login");
    await loginPage.getByTestId("login-identifier-input").fill(user.email);
    await loginPage.getByTestId("login-password-input").fill(password);
    await loginPage.getByTestId("login-submit-button").click();

    await expect(loginPage).toHaveURL(/\/login$/);
    await expect(loginPage.getByText("Incorrect email/username or password")).toBeVisible();
    await loginPage.close();
  });
});
