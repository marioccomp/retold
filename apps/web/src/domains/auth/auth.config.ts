import { NextResponse } from "next/server";
import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
  },

  callbacks: {
    async jwt({ token, user, account, trigger, session }) {
      if (user) {

        token.id = user.id;
        token.role = (user as any).role;
        token.plan = (user as any).plan;
        token.name = user.name;
        token.image = user.image;
        token.username = (user as any).username;
        token.hasCompletedOnboarding = (user as any).hasCompletedOnboarding;
        token.hasPassword =
          "hasPassword" in user ? (user as any).hasPassword : !!(user as any).password;
      }

      // When session.update() is called
      if (trigger === "update" && token.id) {
        // Handle explicit updates passed to update()
        if (session?.user?.hasCompletedOnboarding !== undefined) {
          token.hasCompletedOnboarding = session.user.hasCompletedOnboarding;
        }
        if (session?.user?.username) {
          token.username = session.user.username;
        }

        // If no explicit data was passed, or if we want to sync with DB
        // We only do this if we haven't already updated the relevant flags
        if (session?.user?.hasCompletedOnboarding === undefined && !session?.user?.username) {
          try {
            const { prisma } = await import("@repo/database");
            const freshUser = await prisma.user.findUnique({
              where: { id: Number(token.id) },
              select: {
                username: true,
                name: true,
                image: true,
                role: true,
                plan: true,
                password: true,
                hasCompletedOnboarding: true,
              },
            });
            if (freshUser) {
              token.username = freshUser.username;
              token.name = freshUser.name;
              token.image = freshUser.image;
              token.role = freshUser.role;
              token.plan = freshUser.plan;
              token.hasCompletedOnboarding = freshUser.hasCompletedOnboarding;
              token.hasPassword =
                session?.hasPassword !== undefined ? session.hasPassword : !!freshUser.password;
            }
          } catch (error) {
            console.error("JWT Update Error:", error);
          }
        }
      }

      if (account) {
        token.accessToken = account.access_token as string;
        token.scope = account.scope as string;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as any;
        session.user.plan = token.plan as any;
        session.user.name = token.name as string;
        session.user.image = token.image as string;
        session.user.username = token.username as string;
        session.user.hasCompletedOnboarding = token.hasCompletedOnboarding as boolean;
        session.user.hasPassword = token.hasPassword as boolean;
      }

      if (token.accessToken) {
        (session as any).accessToken = token.accessToken as string;
        (session as any).scope = token.scope as string;
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const role = auth?.user?.role;
      const plan = auth?.user?.plan;
      const username = auth?.user?.username;
      const hasCompletedOnboarding = auth?.user?.hasCompletedOnboarding;

      const pathname = nextUrl.pathname;

      // Rotas que não devem ser bloqueadas pelo middleware de username
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
      const isProfileRoute = /^\/[a-zA-Z0-9_-]+$/.test(pathname); // Rota de perfil /{username}

      // Se o usuário está logado mas não tem username
      // Redireciona apenas se NÃO for rota pública e NÃO for rota de perfil
      if (isLoggedIn && !username && !isPublicRoute) {
        return NextResponse.redirect(new URL("/choose-username", nextUrl));
      }

      // Mandatory redirection to onboarding for newcomers
      if (isLoggedIn && username && hasCompletedOnboarding === false && !isPublicRoute && pathname !== "/onboarding") {
        return NextResponse.redirect(new URL("/onboarding", nextUrl));
      }


      // Rotas premium
      if (pathname.startsWith("/premium")) {
        return isLoggedIn && plan === "PREMIUM";
      }

      // Rotas recruiter
      if (pathname.startsWith("/recruiter")) {
        return isLoggedIn && role === "RECRUITER";
      }

      // Rotas admin
      if (pathname.startsWith("/admin")) {
        return isLoggedIn && role === "ADMIN";
      }

      // Público
      return true;
    },
  },

  providers: [],
} satisfies NextAuthConfig;

declare module "next-auth" {
  interface User {
    id?: string;
    role?: string;
    plan?: string;
    username?: string | null;
    hasPassword?: boolean;
    hasCompletedOnboarding?: boolean;
  }

  interface Session {
    user: User;
  }
}
