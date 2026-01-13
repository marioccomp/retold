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
      }

      // When session.update() is called, fetch fresh user data from DB
      if (trigger === "update" && token.id) {
        if (session?.user?.username) {
          token.username = session.user.username;
        } else {
          const { prisma } = await import("@repo/database");
          const freshUser = await prisma.user.findUnique({
            where: { id: Number(token.id) },
            select: { username: true, name: true, image: true, role: true, plan: true },
          });
          if (freshUser) {
            token.username = freshUser.username;
            token.name = freshUser.name;
            token.image = freshUser.image;
            token.role = freshUser.role;
            token.plan = freshUser.plan;
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

      const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));
      const isProfileRoute = /^\/[a-zA-Z0-9_]+$/.test(pathname); // Rota de perfil /{username}

      // Se o usuário está logado mas não tem username
      // Redireciona apenas se NÃO for rota pública e NÃO for rota de perfil
      if (isLoggedIn && !username && !isPublicRoute) {
        return NextResponse.redirect(new URL("/choose-username", nextUrl));
      }

      //  Rotas privadas
      if (pathname.startsWith("/dashboard")) {
        return isLoggedIn;
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
  }

  interface Session {
    user: User;
  }
}

