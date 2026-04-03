import { NextResponse } from "next/server";

export const GITHUB_APP_INSTALL_USER_COOKIE = "github_app_install_user";

export const githubAppInstallCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 10,
};

export function popupCloseResponse(status: string) {
  return new NextResponse(
    `
<!DOCTYPE html>
<html>
  <head>
    <title>GitHub App</title>
  </head>
  <body>
    <script>
      if (window.opener) {
        window.opener.postMessage(
          { type: "GITHUB_APP_${status}" },
          window.location.origin
        );
      }
      window.close();
    </script>
    <p>Finalizando instalacao...</p>
  </body>
</html>
    `,
    {
      headers: {
        "Content-Type": "text/html",
      },
    }
  );
}
