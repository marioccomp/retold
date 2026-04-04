import { NextRequest } from "next/server";
import { auth } from "@/src/domains/auth/auth";
import { GithubInstallationAuthorizationError } from "@/src/domains/github/github-installation-authorization";
import { saveGithubInstallation } from "./save-installation";
import {
  GITHUB_APP_INSTALL_USER_COOKIE,
  popupCloseResponse,
} from "./install-flow";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const installationId = searchParams.get("installation_id");
  const setupAction = searchParams.get("setup_action");

  if (!installationId || !["install", "update"].includes(setupAction ?? "")) {
    return popupCloseResponse("ERROR");
  }

  const session = await auth();

  if (!session?.user?.id) {
    return popupCloseResponse("NOT_AUTHENTICATED");
  }

  const currentUserId = Number(session.user.id);
  const installFlowUser = req.cookies.get(GITHUB_APP_INSTALL_USER_COOKIE)?.value;

  if (installFlowUser !== String(currentUserId)) {
    return popupCloseResponse("FLOW_INVALID");
  }

  try {
    await saveGithubInstallation({
      installationId,
      userId: currentUserId,
    });
  } catch (error) {
    const responseStatus =
      error instanceof GithubInstallationAuthorizationError
        ? error.code === "GITHUB_ACCOUNT_NOT_LINKED" ||
          error.code === "GITHUB_ACCOUNT_TOKEN_INVALID"
          ? "NOT_LINKED_GITHUB"
          : "INSTALLATION_FORBIDDEN"
        : "ERROR";

    const response = popupCloseResponse(responseStatus);
    response.cookies.delete(GITHUB_APP_INSTALL_USER_COOKIE);
    return response;
  }

  const response = popupCloseResponse("REPOSITORIES_UPDATED");
  response.cookies.delete(GITHUB_APP_INSTALL_USER_COOKIE);
  return response;
}
