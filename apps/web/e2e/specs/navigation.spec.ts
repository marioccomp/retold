import { test, expect } from "@playwright/test";
import { preparePage } from "../helpers/ui";

test.beforeEach(async ({ page }) => {
  await preparePage(page);
});

test.describe("public navigation", () => {
  test("loads the public home page for first-time visitors", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveURL("http://localhost:3000/");
    await expect(page.getByTestId("header-login-button")).toBeVisible();
  });

  test("redirects unauthenticated users away from settings", async ({ page }) => {
    await page.goto("/settings");

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByTestId("login-form")).toBeVisible();
  });

  test("redirects unknown routes back to the home page", async ({ page }) => {
    await page.goto("/this-route-does-not-exist");

    await expect(page).toHaveURL("http://localhost:3000/");
    await expect(page.getByTestId("header-login-button")).toBeVisible();
  });

  test("shows the invalid reset link state when the token is missing", async ({ page }) => {
    await page.goto("/reset-password");

    await expect(page.getByText("Invalid Link")).toBeVisible();
    await expect(page.getByRole("link", { name: "Return to Login" })).toBeVisible();
  });
});
