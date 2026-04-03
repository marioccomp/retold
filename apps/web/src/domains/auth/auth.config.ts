import { NextResponse } from "next/server";
import type { NextAuthConfig } from "next-auth";
import type { JWT } from "next-auth/jwt";

import { userRepository } from "@repo/database";

async function hydrateTokenFromDatabase(token: JWT): Promise<JWT | null> {
  if (!token.id) {
    return token;
  }

  const userId = Number(token.id);

  if (Number.isNaN(userId)) {
    return null;
  }

  const freshUser = await userRepository.findSessionSnapshotById(userId);

  if (!freshUser) {
    return null;
  }

  const tokenSessionVersion =
    typeof token.sessionVersion === "number"
      ? token.sessionVersion
      : freshUser.sessionVersion;

  if (tokenSessionVersion !== freshUser.sessionVersion) {
    return null;
  }

  token.email = freshUser.email;
  token.name = freshUser.name ?? undefined;
  token.picture = freshUser.image ?? undefined;
  token.image = freshUser.image ?? undefined;
  token.role = freshUser.role;
  token.plan = freshUser.plan;
  token.username = freshUser.username;
  token.hasCompletedOnboarding = freshUser.hasCompletedOnboarding;
  token.hasPassword = !!freshUser.password;
  token.sessionVersion = freshUser.sessionVersion;

  return token;
}

export const authConfig = {
  pages: {
    signIn: "/login",
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.id = String(user.id);
      }

      try {
        return await hydrateTokenFromDatabase(token);
      } catch (error) {
        console.error("JWT sync error:", error);
        return null;
      }
    },
    async session({ session, token }) {
      if (!session.user || !token.id) {
        return session;
      }

      session.user.id = token.id;
      session.user.email = typeof token.email === "string" ? token.email : session.user.email;
      session.user.role = token.role;
      session.user.plan = token.plan;
      session.user.name = typeof token.name === "string" ? token.name : session.user.name;
      session.user.image = typeof token.image === "string" ? token.image : session.user.image;
      session.user.username = typeof token.username === "string" ? token.username : null;
      session.user.hasCompletedOnboarding = Boolean(token.hasCompletedOnboarding);
      session.user.hasPassword = Boolean(token.hasPassword);

      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const role = auth?.user?.role;
      const plan = auth?.user?.plan;
      const username = auth?.user?.username;
      const hasCompletedOnboarding = auth?.user?.hasCompletedOnboarding;

      const pathname = nextUrl.pathname;

      const publicRoutes = [
        "/login",
        "/register",
        "/forgot-password",
        "/reset-password",
        "/choose-username",
        "/api",
        "/_next",
        "/favicon.ico",
      ];

      const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));

      if (isLoggedIn && !username && !isPublicRoute) {
        return NextResponse.redirect(new URL("/choose-username", nextUrl));
      }

      if (
        isLoggedIn &&
        username &&
        hasCompletedOnboarding === false &&
        !isPublicRoute &&
        pathname !== "/onboarding"
      ) {
        return NextResponse.redirect(new URL("/onboarding", nextUrl));
      }

      if (pathname.startsWith("/premium")) {
        return isLoggedIn && plan === "PREMIUM";
      }

      if (pathname.startsWith("/recruiter")) {
        return isLoggedIn && role === "RECRUITER";
      }

      if (pathname.startsWith("/admin")) {
        return isLoggedIn && role === "ADMIN";
      }

      return true;
    },
  },

  providers: [],
} satisfies NextAuthConfig;
