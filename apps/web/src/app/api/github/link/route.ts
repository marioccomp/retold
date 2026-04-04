import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { auth } from "@/src/domains/auth/auth";

const STATE_COOKIE = "github_link_state";
const USER_COOKIE = "github_link_user";

export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.redirect(new URL("/login", req.url));
    }

    const clientId = process.env.GITHUB_LINK_CLIENT_ID;
    if (!clientId) {
        return NextResponse.redirect(new URL("/settings?github=oauth_error", req.url));
    }

    const state = crypto.randomBytes(32).toString("hex");
    const baseUrl = new URL(req.url).origin;
    const redirectUri = `${baseUrl}/api/github/callback`;

    const githubAuthorizeUrl = new URL("https://github.com/login/oauth/authorize");
    githubAuthorizeUrl.searchParams.set("client_id", clientId);
    githubAuthorizeUrl.searchParams.set("redirect_uri", redirectUri);
    githubAuthorizeUrl.searchParams.set("scope", "read:user user:email read:org");
    githubAuthorizeUrl.searchParams.set("state", state);

    const res = NextResponse.redirect(githubAuthorizeUrl.toString());

    const cookieOptions = {
        httpOnly: true,
        sameSite: "lax" as const,
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 10, // 10 min
    };

    res.cookies.set(STATE_COOKIE, state, cookieOptions);
    res.cookies.set(USER_COOKIE, session.user.id, cookieOptions);

    return res;
}
