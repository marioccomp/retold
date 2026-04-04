import { prisma } from "@repo/database";

type GithubUserResponse = {
  id: number;
  login: string;
};

type GithubOrgResponse = {
  login: string;
};

export class GithubInstallationAuthorizationError extends Error {
  constructor(
    public readonly code:
      | "GITHUB_ACCOUNT_NOT_LINKED"
      | "GITHUB_ACCOUNT_TOKEN_INVALID"
      | "GITHUB_INSTALLATION_NOT_ALLOWED"
      | "GITHUB_INSTALLATION_ALREADY_CLAIMED",
    message?: string
  ) {
    super(message ?? code);
    this.name = "GithubInstallationAuthorizationError";
  }
}

export type GithubLinkedIdentity = {
  login: string;
  organizations: string[];
};

async function fetchGithubUser(
  accessToken: string
): Promise<GithubUserResponse> {
  const response = await fetch("https://api.github.com/user", {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${accessToken}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (response.status === 401) {
    throw new GithubInstallationAuthorizationError(
      "GITHUB_ACCOUNT_TOKEN_INVALID",
      "Linked GitHub account token is no longer valid"
    );
  }

  if (!response.ok) {
    throw new GithubInstallationAuthorizationError(
      "GITHUB_ACCOUNT_TOKEN_INVALID",
      "Failed to validate linked GitHub account"
    );
  }

  return response.json();
}

async function fetchGithubOrganizations(accessToken: string): Promise<string[]> {
  const response = await fetch("https://api.github.com/user/orgs", {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${accessToken}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (response.status === 401) {
    throw new GithubInstallationAuthorizationError(
      "GITHUB_ACCOUNT_TOKEN_INVALID",
      "Linked GitHub account token is no longer valid"
    );
  }

  if (!response.ok) {
    return [];
  }

  const organizations = (await response.json()) as GithubOrgResponse[];
  return organizations
    .map((organization) => organization.login?.toLowerCase())
    .filter(Boolean);
}

export async function getLinkedGithubIdentityForUser(
  userId: number
): Promise<GithubLinkedIdentity> {
  const account = await prisma.account.findFirst({
    where: {
      userId,
      provider: "github",
    },
    select: {
      access_token: true,
    },
  });

  if (!account?.access_token) {
    throw new GithubInstallationAuthorizationError(
      "GITHUB_ACCOUNT_NOT_LINKED",
      "User must link a GitHub account before installing the GitHub App"
    );
  }

  const user = await fetchGithubUser(account.access_token);
  const organizations = await fetchGithubOrganizations(account.access_token);

  return {
    login: user.login.toLowerCase(),
    organizations,
  };
}

export function assertInstallationBelongsToLinkedGithubIdentity(args: {
  accountLogin: string;
  accountType: string;
  linkedIdentity: GithubLinkedIdentity;
}) {
  const normalizedAccountLogin = args.accountLogin.toLowerCase();

  if (args.accountType === "Organization") {
    if (!args.linkedIdentity.organizations.includes(normalizedAccountLogin)) {
      throw new GithubInstallationAuthorizationError(
        "GITHUB_INSTALLATION_NOT_ALLOWED",
        "GitHub App installation is not accessible to the linked GitHub account"
      );
    }

    return;
  }

  if (normalizedAccountLogin !== args.linkedIdentity.login) {
    throw new GithubInstallationAuthorizationError(
      "GITHUB_INSTALLATION_NOT_ALLOWED",
      "GitHub App installation does not belong to the linked GitHub account"
    );
  }
}
