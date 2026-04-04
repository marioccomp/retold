import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/domains/auth/auth";
import { prisma } from "@repo/database";
import { createLogger } from "@repo/observability";

const STATE_COOKIE = "github_link_state";
const USER_COOKIE = "github_link_user";
const logger = createLogger("web.api.github-callback");

type GithubUser = {
    id: number;
    login: string;
    email: string | null;
};

type GithubEmail = {
    email: string;
    primary: boolean;
    verified: boolean;
    visibility: "public" | "private" | null;
};

async function exchangeCodeForToken(args: {
    code: string;
    redirectUri: string;
    state: string;
}) {
    const clientId = process.env.GITHUB_LINK_CLIENT_ID;
    const clientSecret = process.env.GITHUB_LINK_CLIENT_SECRET;


    if (!clientId || !clientSecret) {
        throw new Error("Missing GitHub OAuth env vars");
    }

    const body = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: args.code,
        redirect_uri: args.redirectUri,
        state: args.state,
    });

    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: { Accept: "application/json" },
        body,
    });

    const json = (await tokenRes.json()) as
        | { access_token: string; token_type: string; scope: string }
        | { error: string; error_description?: string };

    if ("error" in json) {
        throw new Error(json.error_description || json.error);
    }

    return json;
}

async function fetchGithubUser(accessToken: string): Promise<GithubUser> {
    const res = await fetch("https://api.github.com/user", {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/vnd.github+json",
        },
    });

    if (!res.ok) throw new Error("Failed to fetch GitHub user");
    return (await res.json()) as GithubUser;
}

async function fetchGithubPrimaryEmail(accessToken: string): Promise<string | null> {
    const res = await fetch("https://api.github.com/user/emails", {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/vnd.github+json",
        },
    });

    if (!res.ok) return null;

    const emails = (await res.json()) as GithubEmail[];
    if (!Array.isArray(emails) || emails.length === 0) return null;

    const primaryVerified = emails.find((e) => e.primary && e.verified)?.email;
    if (primaryVerified) return primaryVerified;

    const anyVerified = emails.find((e) => e.verified)?.email;
    if (anyVerified) return anyVerified;

    return emails[0]?.email ?? null;
}

export async function GET(req: NextRequest) {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    const session = await auth();
    const currentUserIdStr = session?.user?.id;

    const cookieState = req.cookies.get(STATE_COOKIE)?.value;
    const cookieUser = req.cookies.get(USER_COOKIE)?.value;

    const redirectWith = (path: string) => {
        const res = NextResponse.redirect(new URL(path, req.url));
        res.cookies.delete(STATE_COOKIE);
        res.cookies.delete(USER_COOKIE);
        return res;
    };

    if (!currentUserIdStr) return redirectWith("/login");
    if (!code || !state) return redirectWith("/settings?github=oauth_error");
    if (!cookieState || !cookieUser) return redirectWith("/settings?github=oauth_error");
    if (state !== cookieState) return redirectWith("/settings?github=oauth_error");
    if (cookieUser !== currentUserIdStr) return redirectWith("/settings?github=oauth_error");

    const currentUserId = Number(currentUserIdStr);
    const baseUrl = new URL(req.url).origin;
    const redirectUri = `${baseUrl}/api/github/callback`;

    try {
        const token = await exchangeCodeForToken({ code, redirectUri, state });
        const accessToken = token.access_token;

        const ghUser = await fetchGithubUser(accessToken);
        const providerAccountId = String(ghUser.id);

        // Se esse GitHub ja esta vinculado a OUTRO usuario bloqueia
        const existing = await prisma.account.findUnique({
            where: {
                provider_providerAccountId: {
                    provider: "github",
                    providerAccountId,
                },
            },
            select: { userId: true },
        });

        if (existing && existing.userId !== currentUserId) {
            return redirectWith("/settings?github=already_linked");
        }

        const githubEmail = (await fetchGithubPrimaryEmail(accessToken)) ?? ghUser.email;

        if (existing) {
            await prisma.account.update({
                where: {
                    provider_providerAccountId: {
                        provider: "github",
                        providerAccountId,
                    },
                },
                data: {
                    access_token: accessToken,
                    token_type: token.token_type,
                    scope: token.scope,
                },
            });
        } else {
            await prisma.account.create({
                data: {
                    userId: currentUserId,
                    type: "oauth",
                    provider: "github",
                    providerAccountId,
                    access_token: accessToken,
                    token_type: token.token_type,
                    scope: token.scope,
                },
            });
        }

        await prisma.user.update({
            where: { id: currentUserId },
            data: { githubEmail: githubEmail ?? null },
        });

        return redirectWith("/settings?github=linked");
    } catch (err) {
        logger.error("github.oauth_link_failed", err, {
            currentUserId,
            hasCode: Boolean(code),
            hasState: Boolean(state),
        });
        return redirectWith("/settings?github=oauth_error");
    }
}
