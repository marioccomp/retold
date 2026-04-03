import { NextResponse } from "next/server";
import { requireAuthenticatedUserId, UnauthorizedError } from "@/src/lib/server-auth";
import { getLinkedGithubIdentityForUser, GithubInstallationAuthorizationError } from "@/src/domains/github/github-installation-authorization";
import {
  GITHUB_APP_INSTALL_USER_COOKIE,
  githubAppInstallCookieOptions,
  popupCloseResponse,
} from "../install-flow";

function getGithubAppInstallUrl() {
  const appSlug = process.env.NODE_ENV === "production" ? "retold-inc" : "retolddev";
  return `https://github.com/apps/${appSlug}/installations/new`;
}

export async function GET() {
  try {
    const userId = await requireAuthenticatedUserId();

    await getLinkedGithubIdentityForUser(userId);

    const response = NextResponse.redirect(getGithubAppInstallUrl());
    response.cookies.set(
      GITHUB_APP_INSTALL_USER_COOKIE,
      String(userId),
      githubAppInstallCookieOptions
    );

    return response;
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return popupCloseResponse("NOT_AUTHENTICATED");
    }

    if (
      error instanceof GithubInstallationAuthorizationError &&
      (error.code === "GITHUB_ACCOUNT_NOT_LINKED" || error.code === "GITHUB_ACCOUNT_TOKEN_INVALID")
    ) {
      return popupCloseResponse("NOT_LINKED_GITHUB");
    }

    console.error("GitHub App install start error:", error);
    return popupCloseResponse("ERROR");
  }
}
