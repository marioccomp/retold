import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    accessToken: string;
    scope: string;
    user: {
      id: string;
      role: "USER" | "RECRUITER" | "ADMIN";
      plan: "FREE" | "PREMIUM";
      username: string;
      hasPassword: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "USER" | "RECRUITER" | "ADMIN";
    plan: "FREE" | "PREMIUM";
    username: string;
    hasPassword: boolean;
    accessToken: string;
    scope: string;
  }
}
