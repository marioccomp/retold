import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { currentSession } = vi.hoisted(() => ({
  currentSession: {
    value: null as any,
  },
}));

vi.mock("@/src/domains/auth/auth", () => ({
  auth: vi.fn(async () => currentSession.value),
}));

import { prisma } from "@repo/database";
import { GET as callbackGet } from "@/src/app/api/github/callback/route";
import { GET as linkGet } from "@/src/app/api/github/link/route";
import {
  buildAuthSession,
  cleanupIntegrationRun,
  createIntegrationRunId,
  createIntegrationUser,
  disconnectIntegrationDb,
} from "@/src/test-utils/integration-db";

describe("github routes integration", () => {
  const runsToCleanup = new Set<string>();

  beforeEach(() => {
    currentSession.value = null;
    vi.restoreAllMocks();
    process.env.GITHUB_LINK_CLIENT_ID = "github-client-id";
    process.env.GITHUB_LINK_CLIENT_SECRET = "github-client-secret";
    process.env.AUTH_URL = "";
    process.env.NEXTAUTH_URL = "";
  });

  afterEach(async () => {
    currentSession.value = null;
    vi.unstubAllGlobals();

    for (const runId of runsToCleanup) {
      await cleanupIntegrationRun(runId);
    }
    runsToCleanup.clear();
  });

  afterAll(async () => {
    await disconnectIntegrationDb();
  });

  it("should redirect unauthenticated users to login in the link route", async () => {
    const response = await linkGet(
      new NextRequest("http://localhost:3000/api/github/link")
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/login");
  });

  it("should redirect authenticated users to GitHub authorize and set state cookies", async () => {
    const runId = createIntegrationRunId("glk");
    runsToCleanup.add(runId);
    const user = await createIntegrationUser(runId, { label: "owner" });

    currentSession.value = buildAuthSession(user);

    const response = await linkGet(
      new NextRequest("http://localhost:3000/api/github/link")
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain(
      "https://github.com/login/oauth/authorize"
    );
    const setCookie = response.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("github_link_state=");
    expect(setCookie).toContain("github_link_user=");
  });

  it("should prefer AUTH_URL when building the GitHub callback redirect uri", async () => {
    const runId = createIntegrationRunId("gcbase");
    runsToCleanup.add(runId);
    const user = await createIntegrationUser(runId, { label: "owner" });

    currentSession.value = buildAuthSession(user);
    process.env.AUTH_URL = "https://retold.com.br/";

    const response = await linkGet(
      new NextRequest("http://internal-service:3000/api/github/link")
    );

    expect(response.status).toBe(307);
    const location = response.headers.get("location");
    expect(location).toContain(
      encodeURIComponent("https://retold.com.br/api/github/callback")
    );
  });

  it("should reject callback requests with missing or invalid state data", async () => {
    const runId = createIntegrationRunId("gcb");
    runsToCleanup.add(runId);
    const user = await createIntegrationUser(runId, { label: "owner" });
    currentSession.value = buildAuthSession(user);

    const response = await callbackGet(
      new NextRequest("http://localhost:3000/api/github/callback?code=abc&state=wrong", {
        headers: {
          cookie: `github_link_state=expected; github_link_user=${user.id}`,
        },
      })
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/settings?github=oauth_error"
    );
  });

  it("should create a github account link and persist githubEmail on a valid callback", async () => {
    const runId = createIntegrationRunId("gok");
    runsToCleanup.add(runId);
    const user = await createIntegrationUser(runId, { label: "owner" });
    currentSession.value = buildAuthSession(user);

    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        json: async () => ({
          access_token: "github-access-token",
          token_type: "bearer",
          scope: "read:user user:email read:org",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 987654,
          login: "integration-user",
          email: null,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            email: "integration-gh@example.com",
            primary: true,
            verified: true,
            visibility: "private",
          },
        ],
      });

    vi.stubGlobal("fetch", fetchMock);

    const response = await callbackGet(
      new NextRequest("http://localhost:3000/api/github/callback?code=abc&state=expected", {
        headers: {
          cookie: `github_link_state=expected; github_link_user=${user.id}`,
        },
      })
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/settings?github=linked");

    const account = await prisma.account.findUnique({
      where: {
        provider_providerAccountId: {
          provider: "github",
          providerAccountId: "987654",
        },
      },
    });
    expect(account).toEqual(
      expect.objectContaining({
        userId: user.id,
        provider: "github",
        access_token: "github-access-token",
      })
    );

    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { githubEmail: true },
    });
    expect(updatedUser?.githubEmail).toBe("integration-gh@example.com");
  });

  it("should block linking a github account that already belongs to another user", async () => {
    const runId = createIntegrationRunId("gdu");
    runsToCleanup.add(runId);
    const currentUser = await createIntegrationUser(runId, { label: "current" });
    const otherUser = await createIntegrationUser(runId, { label: "other" });

    await prisma.account.create({
      data: {
        userId: otherUser.id,
        type: "oauth",
        provider: "github",
        providerAccountId: "321654",
        access_token: "older-token",
      },
    });

    currentSession.value = buildAuthSession(currentUser);

    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        json: async () => ({
          access_token: "github-access-token",
          token_type: "bearer",
          scope: "read:user user:email read:org",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 321654,
          login: "already-linked",
          email: null,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

    vi.stubGlobal("fetch", fetchMock);

    const response = await callbackGet(
      new NextRequest("http://localhost:3000/api/github/callback?code=abc&state=expected", {
        headers: {
          cookie: `github_link_state=expected; github_link_user=${currentUser.id}`,
        },
      })
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/settings?github=already_linked"
    );

    const currentUsersGithubAccounts = await prisma.account.count({
      where: {
        userId: currentUser.id,
        provider: "github",
      },
    });
    expect(currentUsersGithubAccounts).toBe(0);
  });
});
