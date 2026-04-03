import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    id?: string;
    role?: "USER" | "RECRUITER" | "ADMIN";
    plan?: "FREE" | "PREMIUM";
    username?: string | null;
    hasPassword?: boolean;
    hasCompletedOnboarding?: boolean;
    sessionVersion?: number;
    authenticatedAt?: number;
  }

  interface Session {
    user: {
      id: string;
      role?: "USER" | "RECRUITER" | "ADMIN";
      plan?: "FREE" | "PREMIUM";
      username?: string | null;
      hasPassword: boolean;
      hasCompletedOnboarding?: boolean;
      authenticatedAt?: number;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: "USER" | "RECRUITER" | "ADMIN";
    plan?: "FREE" | "PREMIUM";
    username?: string | null;
    hasPassword?: boolean;
    hasCompletedOnboarding?: boolean;
    sessionVersion?: number;
    image?: string | null;
    authenticatedAt?: number;
  }
}
