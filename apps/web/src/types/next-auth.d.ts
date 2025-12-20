import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "USER" | "RECRUITER" | "ADMIN";
      plan: "FREE" | "PREMIUM";
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "USER" | "RECRUITER" | "ADMIN";
    plan: "FREE" | "PREMIUM";
  }
}
