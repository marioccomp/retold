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
  }

  interface Session {
    user: {
      id: string;
      username?: string | null;
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
  }
}
