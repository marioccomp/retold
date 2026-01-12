import { NextResponse } from "next/server";
import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
  },

  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.plan = (user as any).plan;
        token.name = user.name;
        token.image = user.image;
        token.username = (user as any).username;
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
      console.log("AAAAAAAAAAAAAAAAAAAAAAAAAA");
      console.log(isLoggedIn, username, role, plan);

      const pathname = nextUrl.pathname;

      // Se o usuário está logado mas não tem username, e não está na página de onboarding
      if (isLoggedIn && !username && pathname !== "/onboarding") {
        return NextResponse.redirect(new URL("/onboarding", nextUrl));
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

