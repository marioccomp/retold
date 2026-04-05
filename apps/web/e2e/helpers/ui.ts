import { expect, Page } from "@playwright/test";

const BASE_URL = "http://localhost:3000";

export async function preparePage(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem("cookie-consent", "true");
  });

  await page.context().addCookies([
    {
      name: "NEXT_LOCALE",
      value: "en",
      url: BASE_URL,
    },
  ]);
}

export async function loginThroughUi(page: Page, identifier: string, password: string) {
  await page.goto("/login");
  await page.getByTestId("login-identifier-input").fill(identifier);
  await page.getByTestId("login-password-input").fill(password);
  await page.getByTestId("login-submit-button").click();
}

export async function waitForAuthSessionCookie(page: Page) {
  await expect
    .poll(async () => {
      const cookies = await page.context().cookies();
      return cookies.some(
        (cookie) =>
          cookie.name.includes("authjs.session-token") ||
          cookie.name.includes("next-auth.session-token")
      );
    })
    .toBeTruthy();
}

export async function logoutThroughUi(page: Page) {
  await page.getByTestId("header-user-menu-trigger").click();
  await expect(page.getByTestId("header-logout-button")).toBeVisible();
  await page.getByTestId("header-logout-button").click();
}
